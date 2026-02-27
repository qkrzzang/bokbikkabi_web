const fs = require('fs');
let content = fs.readFileSync('components/CameraButton.tsx', 'utf8');

const old = `  const [hoverRatings, setHoverRatings] = useState<Record<string, number>>({})
  const [isAgreementChecked, setIsAgreementChecked] = useState(false)`;

const newCode = `  const [hoverRatings, setHoverRatings] = useState<Record<string, number>>({})
  const [alertModal, setAlertModal] = useState<{ show: boolean; message: string }>({ show: false, message: '' })
  const [isAgreementChecked, setIsAgreementChecked] = useState(false)`;

content = content.replace(old, newCode);
fs.writeFileSync('components/CameraButton.tsx', content, 'utf8');
console.log('Added alertModal state');
