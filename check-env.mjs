import 'dotenv/config';

console.log(
  'has RC key?',
  Boolean(process.env.VITE_REVENUECAT_IOS_API_KEY),
  process.env.VITE_REVENUECAT_IOS_API_KEY?.slice(0, 8) + '…'
);
