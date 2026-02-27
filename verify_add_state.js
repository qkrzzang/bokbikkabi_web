const fs = require('fs');
let content = fs.readFileSync('components/CameraButton.tsx', 'utf8');

// Check if already exists
if (content.includes('const [alertModal, setAlertModal]')) {
  console.log('alertModal already exists');
} else {
  const old = '  const [hoverRatings, setHoverRatings] = useState<Record<string, number>>({})';
  const newCode = '  const [hoverRatings, setHoverRatings] = useState<Record<string, number>>({})\n  const [alertModal, setAlertModal] = useState<{ show: boolean; message: string }>({ show: false, message: \'\' })';
  
  content = content.replace(old, newCode);
  fs.writeFileSync('components/CameraButton.tsx', content, 'utf8');
  console.log('Added alertModal state');
}
