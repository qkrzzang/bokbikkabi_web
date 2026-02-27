const fs = require('fs');
let lines = fs.readFileSync('components/CameraButton.tsx', 'utf8').split('\n');

// Find showThankYouModal state and add confetti effect after existing useEffects
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const [showThankYouModal, setShowThankYouModal]')) {
    console.log(`Found showThankYouModal at line ${i+1}`);
    
    // Find the end of useEffect blocks (look for first function that is not useEffect)
    for (let j = i+1; j < Math.min(lines.length, i+200); j++) {
      if (lines[j].trim().startsWith('const ') && !lines[j].includes('useState') && lines[j].includes('=')) {
        console.log(`Found good insertion point at line ${j+1}`);
        
        const confettiEffect = [
          '',
          '  // Confetti effect when review is completed',
          '  useEffect(() => {',
          '    if (showThankYouModal) {',
          '      const duration = 3000',
          '      const end = Date.now() + duration',
          '',
          '      const frame = () => {',
          '        confetti({',
          '          particleCount: 2,',
          '          angle: 60,',
          '          spread: 55,',
          '          origin: { x: 0 },',
          '          colors: [\'#bb0000\', \'#ffffff\']',
          '        })',
          '        confetti({',
          '          particleCount: 2,',
          '          angle: 120,',
          '          spread: 55,',
          '          origin: { x: 1 },',
          '          colors: [\'#bb0000\', \'#ffffff\']',
          '        })',
          '',
          '        if (Date.now() < end) {',
          '          requestAnimationFrame(frame)',
          '        }',
          '      }',
          '',
          '      frame()',
          '    }',
          '  }, [showThankYouModal])',
          ''
        ];
        
        lines.splice(j, 0, ...confettiEffect);
        console.log('Added confetti useEffect');
        break;
      }
    }
    break;
  }
}

fs.writeFileSync('components/CameraButton.tsx', lines.join('\n'), 'utf8');
console.log('Task 2: Confetti effect added');
