const fs = require('fs');
let lines = fs.readFileSync('components/CameraButton.tsx', 'utf8').split('\n');

// Find the end of component (before the last </> closing tag)
for (let i = lines.length - 1; i >= 0; i--) {
  if (lines[i].trim() === '</>' && lines[i+1]?.includes(')')) {
    console.log(`Found component end at line ${i+1}`);
    
    const alertModalJSX = [
      '',
      '      {/* Alert Modal */}',
      '      {alertModal.show && (',
      '        <div className={styles.alertModalOverlay} onClick={() => setAlertModal({ show: false, message: \'\' })}>',
      '          <div className={styles.alertModal} onClick={(e) => e.stopPropagation()}>',
      '            <div className={styles.alertModalContent}>',
      '              <p className={styles.alertModalMessage}>{alertModal.message}</p>',
      '              <button ',
      '                className={styles.alertModalButton} ',
      '                onClick={() => setAlertModal({ show: false, message: \'\' })}',
      '              >',
      '                ?뺤씤',
      '              </button>',
      '            </div>',
      '          </div>',
      '        </div>',
      '      )}',
      ''
    ];
    
    lines.splice(i, 0, ...alertModalJSX);
    console.log(`Inserted Alert Modal UI at line ${i+1}`);
    break;
  }
}

fs.writeFileSync('components/CameraButton.tsx', lines.join('\n'), 'utf8');
console.log('Alert Modal UI added successfully');
