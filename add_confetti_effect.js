const fs = require('fs');
let lines = fs.readFileSync('components/CameraButton.tsx', 'utf8').split('\n');

// 1. Find import section and add confetti
for (let i = 0; i < 20; i++) {
  if (lines[i].includes("import { useAuth }")) {
    console.log(`Found import section at line ${i+1}`);
    lines.splice(i + 1, 0, "import confetti from 'canvas-confetti'");
    console.log('Added confetti import');
    break;
  }
}

// 2. Find showThankYouModal state and add useEffect after it
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const [showThankYouModal, setShowThankYouModal]')) {
    console.log(`Found showThankYouModal at line ${i+1}`);
    
    // Find a good place to insert useEffect (after all useState declarations)
    let insertIdx = i;
    for (let j = i; j < i + 20; j++) {
      if (lines[j].includes('useRef') || lines[j].includes('const videoRef')) {
        insertIdx = j - 1;
        break;
      }
    }
    
    const confettiEffect = [
      '',
      '  // Confetti effect when review is completed',
      '  useEffect(() => {',
      '    if (showThankYouModal) {',
      '      const duration = 3000',
      '      const animationEnd = Date.now() + duration',
      '      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 }',
      '',
      '      const randomInRange = (min: number, max: number) => {',
      '        return Math.random() * (max - min) + min',
      '      }',
      '',
      '      const interval: any = setInterval(() => {',
      '        const timeLeft = animationEnd - Date.now()',
      '',
      '        if (timeLeft <= 0) {',
      '          return clearInterval(interval)',
      '        }',
      '',
      '        const particleCount = 50 * (timeLeft / duration)',
      '',
      '        confetti({',
      '          ...defaults,',
      '          particleCount,',
      '          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }',
      '        })',
      '        confetti({',
      '          ...defaults,',
      '          particleCount,',
      '          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }',
      '        })',
      '      }, 250)',
      '',
      '      return () => clearInterval(interval)',
      '    }',
      '  }, [showThankYouModal])',
      ''
    ];
    
    lines.splice(insertIdx, 0, ...confettiEffect);
    console.log(`Added confetti effect at line ${insertIdx+1}`);
    break;
  }
}

fs.writeFileSync('components/CameraButton.tsx', lines.join('\n'), 'utf8');
console.log('Confetti effect added successfully');
