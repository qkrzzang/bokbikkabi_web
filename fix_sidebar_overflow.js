const fs = require('fs');
let content = fs.readFileSync('components/Sidebar.module.css', 'utf8');

// Update reviewValue to handle overflow properly
content = content.replace(
  /\.reviewValue \{[\s\S]*?font-size: 13px;[\s\S]*?color: #1e293b;[\s\S]*?flex: 1;[\s\S]*?white-space: nowrap;[\s\S]*?display: inline-block;[\s\S]*?\}/,
  `.reviewValue {
  font-size: 13px;
  color: #1e293b;
  flex: 1;
  word-wrap: break-word;
  overflow-wrap: break-word;
  max-width: 100%;
}`
);

// Add overflow handling to reviewField
const reviewFieldStyle = `.reviewField {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 10px;
}`;

const newReviewFieldStyle = `.reviewField {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 10px;
  overflow: hidden;
  max-width: 100%;
}`;

content = content.replace(reviewFieldStyle, newReviewFieldStyle);

// Ensure reviewLabel doesn't overflow
content = content.replace(
  /\.reviewLabel \{[\s\S]*?\}/,
  `.reviewLabel {
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  min-width: 90px;
  flex-shrink: 0;
}`
);

fs.writeFileSync('components/Sidebar.module.css', content, 'utf8');
console.log('Fixed sidebar text overflow');
