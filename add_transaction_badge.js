const fs = require('fs');
let content = fs.readFileSync('components/Sidebar.tsx', 'utf8');

// Find and replace the transaction_tag display with badge style
const oldTransactionDisplay = `                  {selectedContract.transaction_tag && (
                    <div className={styles.reviewField}>
                      <span className={styles.reviewLabel}>嫄곕옒 援щ텇:</span>
                      <span className={styles.reviewValue}>{selectedContract.transaction_tag}</span>
                    </div>
                  )}`;

const newTransactionDisplay = `                  {selectedContract.transaction_tag && (
                    <div className={styles.reviewField}>
                      <span className={styles.reviewLabel}>嫄곕옒 ?좏삎:</span>
                      <span className={styles.transactionBadge}>
                        {selectedContract.transaction_tag === \'SALE\' ? \'留ㅻℓ\' :
                         selectedContract.transaction_tag === \'LEASE\' ? \'?꾨?李?' :
                         selectedContract.transaction_tag === \'RENT\' ? \'?붿꽭\' :
                         selectedContract.transaction_tag}
                      </span>
                    </div>
                  )}`;

content = content.replace(oldTransactionDisplay, newTransactionDisplay);

fs.writeFileSync('components/Sidebar.tsx', content, 'utf8');
console.log('Added transaction type badge');
