const fs = require('fs');
let content = fs.readFileSync('components/Sidebar.module.css', 'utf8');

// Replace .reviewValue to prevent star wrapping
content = content.replace(
  /\.reviewValue \{\s+font-size: 13px;\s+color: #1e293b;\s+flex: 1;\s+word-break: break-word;\s+\}/,
  `.reviewValue {
  font-size: 13px;
  color: #1e293b;
  flex: 1;
  white-space: nowrap;
  display: inline-block;
}`
);

fs.writeFileSync('components/Sidebar.module.css', content, 'utf8');
console.log('Fixed reviewValue to prevent star wrapping');
