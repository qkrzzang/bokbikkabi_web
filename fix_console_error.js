const fs = require('fs');
let lines = fs.readFileSync('components/CameraButton.tsx', 'utf8').split('\n');

// Find and fix the broken console.error blocks
for (let i = 0; i < lines.length; i++) {
  // Find duplicate console.error followed by broken object
  if (lines[i].includes("console.error('Review limit check error:', error)") && 
      i+1 < lines.length && 
      lines[i+1].includes("console.error('Review limit check error:', error)")) {
    
    console.log(`Found duplicate console.error at line ${i+1}`);
    
    // Check if next lines have object properties without opening brace
    if (i+2 < lines.length && lines[i+2].trim().startsWith('code:')) {
      console.log('Found broken object structure, fixing...');
      
      // Fix: remove duplicate line and add opening brace
      lines.splice(i+1, 1); // Remove duplicate
      lines[i+1] = lines[i+1].replace(/^\s+code:/, '        console.error({');
      lines[i+1] = '        console.error({' + '\n' + '          code: error.code,';
      
      console.log(`Fixed lines ${i+1} to ${i+3}`);
    }
  }
}

fs.writeFileSync('components/CameraButton.tsx', lines.join('\n'), 'utf8');
console.log('Done');
