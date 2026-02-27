const fs = require('fs');
let lines = fs.readFileSync('components/CameraButton.tsx', 'utf8').split('\n');

// 1. Find import section and check if confetti is imported
let hasConfetti = false;
for (let i = 0; i < 20; i++) {
  if (lines[i].includes("import confetti")) {
    hasConfetti = true;
    console.log('Confetti already imported');
    break;
  }
}

if (!hasConfetti) {
  for (let i = 0; i < 20; i++) {
    if (lines[i].includes("import { useAuth }")) {
      console.log(`Adding confetti import at line ${i+2}`);
      lines.splice(i + 1, 0, "import confetti from 'canvas-confetti'");
      break;
    }
  }
}

// 2. Find alertModal state and add confetti effect after other useEffect hooks
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('window.addEventListener(\'review:start\', handleReviewStart)')) {
    console.log(`Found event listener at line ${i+1}`);
    
    // Insert confetti effect after the first useEffect
    let insertIdx = i + 10;
    for (let j = i; j < i + 20; j++) {
      if (lines[j].includes('}, [])') && !lines[j+1]?.includes('useEffect')) {
        insertIdx = j + 2;
        break;
      }
    }
    
    const confettiEffect = [
      '  // Confetti effect when review is completed',
      '  useEffect(() => {',
      '    if (showThankYouModal) {',
      '      console.log(\'[Confetti] Starting confetti effect\')',
      '      ',
      '      // Disable scrolling and clicking during confetti',
      '      document.body.style.overflow = \'hidden\'',
      '      document.body.style.pointerEvents = \'none\'',
      '      ',
      '      const duration = 2000 // 2 seconds',
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
      '          clearInterval(interval)',
      '          // Re-enable scrolling and clicking after confetti',
      '          setTimeout(() => {',
      '            document.body.style.overflow = \'\'',
      '            document.body.style.pointerEvents = \'\'',
      '            console.log(\'[Confetti] Re-enabled user interactions\')',
      '          }, 300)',
      '          return',
      '        }',
      '',
      '        const particleCount = 50 * (timeLeft / duration)',
      '',
      '        // Left side confetti',
      '        confetti({',
      '          ...defaults,',
      '          particleCount,',
      '          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }',
      '        })',
      '        ',
      '        // Right side confetti',
      '        confetti({',
      '          ...defaults,',
      '          particleCount,',
      '          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }',
      '        })',
      '      }, 250)',
      '',
      '      return () => {',
      '        clearInterval(interval)',
      '        document.body.style.overflow = \'\'',
      '        document.body.style.pointerEvents = \'\'',
      '      }',
      '    }',
      '  }, [showThankYouModal])',
      ''
    ];
    
    lines.splice(insertIdx, 0, ...confettiEffect);
    console.log(`Inserted confetti effect at line ${insertIdx+1}`);
    break;
  }
}

fs.writeFileSync('components/CameraButton.tsx', lines.join('\n'), 'utf8');
console.log('Confetti effect with screen lock added successfully');
