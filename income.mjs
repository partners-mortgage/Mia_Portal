// Arithmetic preparation, not qualifying-income policy or underwriting.
function cents(value){if(!/^\d{1,9}(\.\d{1,2})?$/.test(String(value)))throw Error('Use a nonnegative decimal amount with at most two decimal places');const [whole,fraction='']=String(value).split('.');return BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0'));}
export function monthlyBase({amount,frequency,weeklyHours,evidence}){
 if(typeof evidence!=='string'||!evidence.trim())return {status:'blocked',reason:'Source evidence is required'};
 const pay=cents(amount);let numerator,denominator=12n;
 const periods={annual:1n,monthly:12n,semimonthly:24n,biweekly:26n,weekly:52n};
 if(frequency==='hourly'){
  if(weeklyHours===undefined||!/^\d{1,2}(\.\d{1,2})?$/.test(String(weeklyHours))||Number(weeklyHours)<=0||Number(weeklyHours)>80)return {status:'blocked',reason:'Documented regular weekly hours required; never assume 40'};
  numerator=pay*cents(weeklyHours)*52n;denominator*=100n;
 }else if(periods[frequency])numerator=pay*periods[frequency];else return {status:'blocked',reason:'Known pay frequency required'};
 const rounded=(numerator+denominator/2n)/denominator;
 return {status:'computed',monthly:`${rounded/100n}.${String(rounded%100n).padStart(2,'0')}`,exactCentsNumerator:String(numerator),exactDenominator:String(denominator),rule:'base-arithmetic.v1',evidence,reviewRequired:true};
}
