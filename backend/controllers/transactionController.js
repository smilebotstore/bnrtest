/**
 * Transaction Controller (Server-side Atomic Operations)
 */
const db = require('../database/firebaseService');
const discordService = require('../services/discordService');
const config = require('../../config');

class TransactionController {
    // Lookup receiver name before transfer confirmation
    async lookupAccount(req, res) {
        try {
            const { accountNumber } = req.params;
            if (!accountNumber) {
                return res.status(400).json({ success: false, message: 'Nomor rekening tujuan harus diisi.' });
            }

            if (accountNumber === req.user.accountNumber) {
                return res.status(400).json({ success: false, message: 'Tidak dapat mentransfer ke nomor rekening sendiri.' });
            }

            const account = await db.get(`accounts/${accountNumber}`);
            if (!account || account.status !== 'ACTIVE') {
                return res.status(404).json({ success: false, message: 'Nomor rekening tujuan tidak ditemukan atau tidak aktif.' });
            }

            return res.json({
                success: true,
                accountNumber: account.accountNumber,
                ownerName: account.ownerName,
                username: account.username
            });
        } catch (err) {
            console.error('[Lookup Error]', err);
            return res.status(500).json({ success: false, message: 'Gagal memverifikasi nomor rekening tujuan.' });
        }
    }

    // Server-side Atomic Transfer Execution
    async transfer(req, res) {
        try {
            const { receiverAccountNumber, amount, note } = req.body;
            const parsedAmount = parseInt(amount, 10);

            if (isNaN(parsedAmount) || parsedAmount <= 0) {
                return res.status(400).json({ success: false, message: 'Nominal transfer tidak valid.' });
            }

            if (parsedAmount < config.banking.minimumTransfer) {
                return res.status(400).json({ 
                    success: false, 
                    message: `Minimal transfer adalah Rp ${config.banking.minimumTransfer.toLocaleString('id-ID')}` 
                });
            }

            if (parsedAmount > config.banking.maximumTransfer) {
                return res.status(400).json({ 
                    success: false, 
                    message: `Nominal transfer melebihi batas transaksi per transfer.` 
                });
            }

            const senderAccNo = req.user.accountNumber;
            if (receiverAccountNumber === senderAccNo) {
                return res.status(400).json({ success: false, message: 'Tidak dapat mentransfer ke rekening sendiri.' });
            }

            // Verify receiver account
            const receiverAccount = await db.get(`accounts/${receiverAccountNumber}`);
            if (!receiverAccount || receiverAccount.status !== 'ACTIVE') {
                return res.status(404).json({ success: false, message: 'Rekening penerima tidak ditemukan atau berstatus nonaktif.' });
            }

            // Check sender account and balance
            const senderAccount = await db.get(`accounts/${senderAccNo}`);
            if (!senderAccount || senderAccount.status !== 'ACTIVE') {
                return res.status(403).json({ success: false, message: 'Rekening pengirim tidak aktif.' });
            }

            const transferFee = config.banking.transferFee;
            const totalDeduction = parsedAmount + transferFee;

            const senderBalance = senderAccount.balance || 0;
            if (senderBalance < totalDeduction) {
                return res.status(400).json({ 
                    success: false, 
                    message: `Saldo tidak mencukupi. Saldo saat ini: Rp ${senderBalance.toLocaleString('id-ID')}, Dibutuhkan: Rp ${totalDeduction.toLocaleString('id-ID')} (termasuk biaya admin Rp ${transferFee.toLocaleString('id-ID')}).` 
                });
            }

            // Generate Unique Transaction ID
            const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const randSuffix = Math.floor(1000 + Math.random() * 9000);
            const txId = `TX-${dateStr}-${Date.now().toString().slice(-6)}-${randSuffix}`;

            // Execute Atomic Balance Updates
            const newSenderBalance = senderBalance - totalDeduction;
            const newReceiverBalance = (receiverAccount.balance || 0) + parsedAmount;

            await db.update(`accounts/${senderAccNo}`, { balance: newSenderBalance });
            await db.update(`accounts/${receiverAccountNumber}`, { balance: newReceiverBalance });

            const timestamp = Date.now();
            const txRecord = {
                id: txId,
                type: 'TRANSFER',
                senderAccount: senderAccNo,
                senderName: senderAccount.ownerName || req.user.name,
                senderUsername: req.user.username,
                receiverAccount: receiverAccountNumber,
                receiverName: receiverAccount.ownerName,
                receiverUsername: receiverAccount.username,
                amount: parsedAmount,
                fee: transferFee,
                total: totalDeduction,
                note: note ? note.trim().slice(0, 100) : 'Transfer BNR',
                status: 'SUCCESS',
                timestamp
            };

            // Save Transaction Records
            await db.set(`transactions/${txId}`, txRecord);
            await db.set(`accountTransactions/${senderAccNo}/${txId}`, { ...txRecord, role: 'DEBIT' });
            await db.set(`accountTransactions/${receiverAccountNumber}/${txId}`, { ...txRecord, role: 'CREDIT' });

            // Send Realtime Notifications
            await db.sendNotification(
                req.user.username,
                'Transfer Berhasil',
                `Transfer sebesar Rp ${parsedAmount.toLocaleString('id-ID')} ke ${receiverAccount.ownerName} (${receiverAccountNumber}) telah berhasil.`
            );

            await db.sendNotification(
                receiverAccount.username,
                'Transfer Masuk',
                `Anda menerima dana sebesar Rp ${parsedAmount.toLocaleString('id-ID')} dari ${senderAccount.ownerName}.`
            );

            // Audit Log
            await db.logAudit(
                req.user.username,
                'TRANSFER',
                `Transfer ${txId}: Rp ${parsedAmount} ke ${receiverAccountNumber} (${receiverAccount.ownerName})`
            );

            // Discord Webhook Notification (Server-side)
            discordService.sendTransactionLog({
                senderName: senderAccount.ownerName,
                senderAccount: senderAccNo,
                receiverName: receiverAccount.ownerName,
                receiverAccount: receiverAccountNumber,
                amount: parsedAmount,
                txId,
                note: txRecord.note
            });

            return res.json({
                success: true,
                message: 'Transfer berhasil diproses.',
                transaction: txRecord,
                newBalance: newSenderBalance
            });
        } catch (err) {
            console.error('[Transfer Error]', err);
            return res.status(500).json({ success: false, message: 'Terjadi kesalahan sistem saat memproses transfer.' });
        }
    }

    // Get mutation / history
    async getHistory(req, res) {
        try {
            const accNo = String(req.user.accountNumber || '').trim();
            const username = String(req.user.username || '').trim().toLowerCase();

            const [accountTxMap, globalTxMap] = await Promise.all([
                db.get(`accountTransactions/${accNo}`).catch(() => ({})),
                db.get('transactions').catch(() => ({}))
            ]);

            const txSet = new Map();

            // 1. Ingest account-specific transactions (V2 indexed format)
            if (accountTxMap && typeof accountTxMap === 'object') {
                Object.entries(accountTxMap).forEach(([k, tx]) => {
                    if (!tx) return;
                    const id = tx.id || tx.transactionId || tx.referenceId || k;
                    const role = tx.role || tx.direction || (tx.type === 'FEE_CHANGE_NAME' ? 'DEBIT' : 'CREDIT');
                    txSet.set(id, {
                        ...tx,
                        id,
                        role,
                        note: tx.note || tx.description || (role === 'DEBIT' ? 'Transfer Keluar' : 'Transfer Masuk')
                    });
                });
            }

            // 2. Ingest global transactions (V1 format & platform activities from database)
            if (globalTxMap && typeof globalTxMap === 'object') {
                Object.entries(globalTxMap).forEach(([k, tx]) => {
                    if (!tx) return;
                    const id = tx.id || tx.transactionId || tx.referenceId || k;
                    if (txSet.has(id)) return; // Already present from account-specific list

                    const sAcc = String(tx.senderAccount || tx.accountNumber || '').trim();
                    const rAcc = String(tx.receiverAccount || '').trim();
                    const sUser = String(tx.senderUsername || '').trim().toLowerCase();
                    const rUser = String(tx.receiverUsername || '').trim().toLowerCase();

                    const isSender = (sAcc && sAcc === accNo) || (username && sUser === username);
                    const isReceiver = (rAcc && rAcc === accNo) || (username && rUser === username);

                    if (isSender || isReceiver) {
                        let role = tx.role || tx.direction;
                        if (!role) {
                            if (isSender) {
                                role = 'DEBIT';
                            } else if (isReceiver) {
                                role = 'CREDIT';
                            }
                        }

                        if (!role) {
                            if (tx.type === 'SERVICE_FEE' || tx.type === 'FEE_CHANGE_NAME' || tx.type === 'BBN_PURCHASE') {
                                role = 'DEBIT';
                            } else {
                                role = 'CREDIT';
                            }
                        }

                        const note = tx.note || tx.description || (role === 'DEBIT' ? 'Transfer Keluar' : 'Transfer Masuk');

                        txSet.set(id, {
                            ...tx,
                            id,
                            role,
                            note
                        });
                    }
                });
            }

            const transactions = Array.from(txSet.values());
            // Sort newest first
            transactions.sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0));

            return res.json({
                success: true,
                transactions
            });
        } catch (err) {
            console.error('[History Error]', err);
            return res.status(500).json({ success: false, message: 'Gagal mengambil riwayat transaksi.' });
        }
    }
}

module.exports = new TransactionController();
