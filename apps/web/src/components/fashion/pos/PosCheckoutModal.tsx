import { X, CheckCircle, Printer, Mail, CreditCard, Banknote, Smartphone, Divide, ArrowLeft, Send } from 'lucide-react';
import { usePos } from '../../../context/pos-context';
import { formatCurrency } from '../../../lib/localization';
import { useBusiness } from '../../../context/business-context';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

export function PosCheckoutModal() {
  const { isCheckoutModalOpen, setIsCheckoutModalOpen, total, processCheckout, lastTransaction } = usePos();
  const { selectedBusiness } = useBusiness();
  const [step, setStep] = useState<'payment' | 'success'>('payment');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'Mobile' | 'Split'>('Card');
  const [amountTendered, setAmountTendered] = useState('');
  const [email, setEmail] = useState('');
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  if (!isCheckoutModalOpen) return null;

  const handlePayment = () => {
    // Simulate payment processing
    setTimeout(() => {
      setStep('success');
      // Process checkout (update inventory) when payment is successful
      processCheckout(paymentMethod);
    }, 1000);
  };

  const handleClose = () => {
    setIsCheckoutModalOpen(false);
    if (step === 'success') {
      setStep('payment');
      setAmountTendered('');
      setEmail('');
      setPaymentMethod('Card');
      setShowEmailInput(false);
    }
  };

  const handlePrintReceipt = () => {
    if (!lastTransaction) return;

    const receiptContent = `
      <html>
        <head>
          <title>Receipt</title>
          <style>
            body { font-family: monospace; padding: 20px; max-width: 300px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 20px; }
            .item { display: flex; justify-content: space-between; margin-bottom: 5px; }
            .divider { border-top: 1px dashed #000; margin: 10px 0; }
            .total { display: flex; justify-content: space-between; font-weight: bold; margin-top: 10px; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>${selectedBusiness?.name || 'Fashion Store'}</h2>
            <p>${new Date().toLocaleString()}</p>
            <p>Order #${lastTransaction.id}</p>
            ${lastTransaction.customerName ? `<p>Customer: ${lastTransaction.customerName}</p>` : ''}
          </div>
          
          <div class="divider"></div>
          
          ${lastTransaction.items.map(item => `
            <div class="item">
              <span>${item.productName} (${item.size}/${item.color}) x${item.quantity}</span>
              <span>${formatCurrency(item.price * item.quantity, selectedBusiness?.currencyCode)}</span>
            </div>
          `).join('')}
          
          <div class="divider"></div>
          
          <div class="item">
            <span>Subtotal</span>
            <span>${formatCurrency(lastTransaction.subtotal, selectedBusiness?.currencyCode)}</span>
          </div>
          <div class="item">
            <span>Tax</span>
            <span>${formatCurrency(lastTransaction.tax, selectedBusiness?.currencyCode)}</span>
          </div>
          <div class="total">
            <span>Total</span>
            <span>${formatCurrency(lastTransaction.total, selectedBusiness?.currencyCode)}</span>
          </div>
          
          <div class="footer">
            <p>Thank you for shopping with us!</p>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '', 'width=400,height=600');
    if (printWindow) {
      printWindow.document.write(receiptContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      // printWindow.close(); // Optional: close automatically
    }
  };

  const handleEmailReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSendingEmail(true);
    // Simulate API call
    setTimeout(() => {
      setIsSendingEmail(false);
      setShowEmailInput(false);
      alert(`Receipt sent to ${email}!`);
    }, 1000);
  };

  const changeDue = amountTendered ? parseFloat(amountTendered) - total : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {step === 'payment' ? 'Payment' : 'Transaction Complete'}
          </h2>
          <button onClick={handleClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            {step === 'payment' ? (
              <motion.div
                key="payment"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <div className="text-center mb-8">
                  <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Total Amount</div>
                  <div className="text-4xl font-bold text-slate-900 dark:text-white">
                    {formatCurrency(total, selectedBusiness?.currencyCode)}
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 mb-6">
                    {[
                        { id: 'Card', icon: CreditCard, label: 'Card' },
                        { id: 'Cash', icon: Banknote, label: 'Cash' },
                        { id: 'Mobile', icon: Smartphone, label: 'Mobile' },
                        { id: 'Split', icon: Divide, label: 'Split' },
                    ].map(method => (
                        <button
                            key={method.id}
                            onClick={() => setPaymentMethod(method.id as any)}
                            className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                                paymentMethod === method.id
                                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                                    : 'border-slate-100 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-500'
                            }`}
                        >
                            <method.icon size={24} className="mb-1" />
                            <span className="text-xs font-bold">{method.label}</span>
                        </button>
                    ))}
                </div>

                <div className="space-y-4 mb-8">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Amount Tendered
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
                      <input 
                        type="number" 
                        value={amountTendered}
                        onChange={(e) => setAmountTendered(e.target.value)}
                        className="w-full pl-8 pr-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-lg font-bold focus:ring-2 focus:ring-indigo-500"
                        placeholder="0.00"
                        autoFocus
                      />
                    </div>
                  </div>
                  
                  {parseFloat(amountTendered) >= total && (
                    <div className="flex justify-between items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-xl text-green-700 dark:text-green-400">
                      <span className="font-medium">Change Due</span>
                      <span className="text-xl font-bold">{formatCurrency(changeDue, selectedBusiness?.currencyCode)}</span>
                    </div>
                  )}
                </div>

                <button 
                  onClick={handlePayment}
                  disabled={!amountTendered || parseFloat(amountTendered) < total}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg transition-all"
                >
                  Confirm Payment
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-center"
              >
                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle size={40} />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Payment Successful</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-8">
                  Transaction #{lastTransaction?.id}
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={handlePrintReceipt}
                    className="flex items-center justify-center gap-2 p-4 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 font-medium transition-colors"
                  >
                    <Printer size={20} />
                    Print Receipt
                  </button>
                  <button 
                    onClick={() => setShowEmailInput(true)}
                    className="flex items-center justify-center gap-2 p-4 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 font-medium transition-colors"
                  >
                    <Mail size={20} />
                    Email Receipt
                  </button>
                </div>

                <AnimatePresence>
                  {showEmailInput && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute inset-0 bg-white dark:bg-slate-800 p-6 flex flex-col z-20"
                    >
                      <div className="flex items-center gap-3 mb-6">
                        <button 
                          onClick={() => setShowEmailInput(false)}
                          className="p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"
                        >
                          <ArrowLeft size={20} />
                        </button>
                        <h3 className="text-lg font-bold">Email Receipt</h3>
                      </div>
                      
                      <form onSubmit={handleEmailReceipt} className="flex-1 flex flex-col">
                        <div className="mb-6">
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Customer Email
                          </label>
                          <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder="customer@example.com"
                              className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500"
                              autoFocus
                              required
                            />
                          </div>
                          <p className="text-xs text-slate-500 mt-2">
                            We&apos;ll send a digital copy of the receipt to this address.
                          </p>
                        </div>

                        <button
                          type="submit"
                          disabled={isSendingEmail}
                          className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 mt-auto"
                        >
                          {isSendingEmail ? (
                            <span className="animate-pulse">Sending...</span>
                          ) : (
                            <>
                              <Send size={20} />
                              Send Receipt
                            </>
                          )}
                        </button>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                <button 
                  onClick={handleClose}
                  className="w-full mt-6 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl hover:opacity-90 transition-opacity"
                >
                  New Sale
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
