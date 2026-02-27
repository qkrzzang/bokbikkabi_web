const fs = require('fs');
let content = fs.readFileSync('components/Sidebar.module.css', 'utf8');

// Find .reviewValue and add .transactionBadge after it
const insertPoint = `.reviewValue {
  font-size: 13px;
  color: #1e293b;
  flex: 1;
  white-space: nowrap;
  display: inline-block;
}`;

const transactionBadgeStyle = `
.transactionBadge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  background: linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%);
  color: #ffffff;
  white-space: nowrap;
}`;

content = content.replace(insertPoint, insertPoint + transactionBadgeStyle);

fs.writeFileSync('components/Sidebar.module.css', content, 'utf8');
console.log('Added transaction badge CSS');
