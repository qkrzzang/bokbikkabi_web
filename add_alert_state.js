const fs = require('fs');
let content = fs.readFileSync('components/CameraButton.tsx', 'utf8');

// Find a good place to add alertModal state (after showThankYouModal)
const pattern = /const \[showThankYouModal, setShowThankYouModal\] = useState\(false\)/;
const replacement = `const [showThankYouModal, setShowThankYouModal] = useState(false)
  const [alertModal, setAlertModal] = useState<{ show: boolean; message: string }>({ show: false, message '' })`;

content = content.replace(pattern, replacement);

fs.writeFileSync('components/CameraButton.tsx', content, 'utf8');
console.log('Added alertModal state');
