const fs = require('fs');
let content = fs.readFileSync('components/Sidebar.module.css', 'utf8');

// Add specific style for star display
const starDisplayStyle = `
.reviewValue:has(> *) {
  white-space: nowrap;
  overflow: visible;
}`;

// Insert after reviewValue
const reviewValueEnd = content.indexOf('.reviewValue {') + content.substring(content.indexOf('.reviewValue {')).indexOf('}') + 1;

content = content.slice(0, reviewValueEnd) + starDisplayStyle + content.slice(reviewValueEnd);

fs.writeFileSync('components/Sidebar.module.css', content, 'utf8');
console.log('Added star-specific style');
