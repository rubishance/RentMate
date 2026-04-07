import { generatePaymentSchedule } from './src/utils/payment-generator';

const startDate = '2024-03-20';
const endDate = '2025-01-15';
const baseRent = 5000;
const currency = 'ILS';
const paymentFrequency = 'monthly';
const paymentDay = 1;

const payments = generatePaymentSchedule({
    startDate,
    endDate,
    baseRent,
    currency,
    paymentFrequency,
    paymentDay
});

console.log('Generated Payments:', payments.length);
payments.forEach((p, i) => {
    console.log(`Payment [${i+1}] - Due on: ${p.due_date} | Amount: ${p.amount} ${p.currency}`);
});
