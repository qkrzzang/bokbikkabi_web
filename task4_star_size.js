const fs = require('fs');
let lines = fs.readFileSync('components/CameraButton.module.css', 'utf8').split('\n');

// Find the line with .starRatingText in mobile section
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('.starRatingText') && i > 1100) {
    // Find the closing brace of starRatingText
    for (let j = i+1; j < lines.length; j++) {
      if (lines[j].trim() === '}') {
        console.log(`Found end of starRatingText at line ${j+1}`);
        
        // Insert starButton mobile style after it
        const starButtonStyle = [
          '',
          '  .starButton {',
          '    font-size: 20px;',
          '    padding: 2px;',
          '  }'
        ];
        
        lines.splice(j+1, 0, ...starButtonStyle);
        console.log('Added mobile starButton style');
        break;
      }
    }
    break;
  }
}

fs.writeFileSync('components/CameraButton.module.css', lines.join('\n'), 'utf8');
console.log('Done');
