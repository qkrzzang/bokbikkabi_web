const fs = require('fs');
let content = fs.readFileSync('components/CameraButton.tsx', 'utf8');

// Remove duplicate supabase client creation and auth check in handleConfirm
const oldPattern = /const handleConfirm = async \(\) => \{[\s\S]*?const supabase = createClientComponentClient\(\)[\s\S]*?const \{ data: \{ user: authUser \} \} = await supabase\.auth\.getUser\(\)[\s\S]*?if \(!authUser\?\.id\) \{[\s\S]*?setAlertModal\(\{ show: true, message: 'Login required\.' \}\)[\s\S]*?return[\s\S]*?\}/;

const newFunc = `const handleConfirm = async () => {
    if (!isAgreementChecked) {
      return
    }

    // Check authentication
    if (!checkAuth()) return

    if (!authUser?.id) {
      setAlertModal({ show: true, message: 'Login required.' })
      return
    }

    // Check review limits
    const canProceed = await checkReviewLimits()
    if (!canProceed) {
      setIsConfirmModalOpen(false)
      setIsAgreementChecked(false)
      return
    }

    setIsConfirmModalOpen(false)
    setIsAgreementChecked(false)
    setIsOpen(true)
    setMode('select')
    setCapturedImage(null)
    console.log('Review process started')
  }`;

if (content.match(oldPattern)) {
  content = content.replace(oldPattern, newFunc);
  console.log('Fixed handleConfirm');
} else {
  console.log('Pattern not found, trying simpler replacement');
}

fs.writeFileSync('components/CameraButton.tsx', content, 'utf8');
console.log('Done');
