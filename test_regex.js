const fixRtl = (text) => {
    if (!text) return '';
    const hasHebrew = /[\u0590-\u05FF]/.test(text);
    if (!hasHebrew) return text;

    const ltrRegex = /([a-zA-Z_()]+(?:\s+[a-zA-Z_()]+)*|[₪$€£]?\d+(?:[/.,-]\d+)*(?:%|₪)?)/g;
    const tokens = [];
    
    let replaced = text.replace(ltrRegex, (match) => {
        const id = tokens.length;
        tokens.push(match);
        return `~${id}~`;
    });

    let reversed = replaced.split('').reverse().join('');

    reversed = reversed.replace(/~(\d+)~/g, (_, idStr) => {
        const originalId = idStr.split('').reverse().join('');
        return tokens[parseInt(originalId, 10)] || '';
    });

    return reversed;
};

const t1 = "הערות למסלולי מיסוי מקרקעין:\n* מסלול 10%: החישוב מתבצע על סעיף 1 (הכנסות ברוטו) ללא ניכוי הוצאות ופחת.\n* מסלול פטור / מס שולי: יש להתחשב בתוצאת סעיף 4 לאחר שקלול הוצאות מוכרות, פחת בניין (לרוב 2%-4%) וריבית משכנתא.";
const start1 = Date.now();
console.log(fixRtl(t1));
console.log("Time:", Date.now() - start1, "ms");

const t2 = "דמי ניהול והחזקה (Management)";
const start2 = Date.now();
console.log(fixRtl(t2));
console.log("Time:", Date.now() - start2, "ms");
