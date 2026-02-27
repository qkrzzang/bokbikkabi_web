const fs = require('fs');
let lines = fs.readFileSync('components/PropertyDetailModal.module.css', 'utf8').split('\n');

// Find mobile ratingStars and update it
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('.ratingStars {') && i > 400) {
    console.log(`Found mobile ratingStars at line ${i+1}`);
    
    // Find the closing brace
    for (let j = i+1; j < Math.min(lines.length, i+10); j++) {
      if (lines[j].trim() === '}') {
        console.log(`Found closing brace at line ${j+1}`);
        
        // Replace the content
        lines[i+1] = '    font-size: 16px;';
        lines.splice(i+2, 0, '    letter-spacing: 1px;');
        lines.splice(i+3, 0, '    white-space: nowrap;');
        lines.splice(i+4, 0, '    display: inline-block;');
        
        console.log('Updated mobile ratingStars style');
        break;
      }
    }
    break;
  }
}

fs.writeFileSync('components/PropertyDetailModal.module.css', lines.join('\n'), 'utf8');
console.log('Task 4: Mobile stars updated to display in one line');
