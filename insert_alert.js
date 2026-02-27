const fs = require('fs');
let lines = fs.readFileSync('components/CameraButton.tsx', 'utf8').split('\n');

// Find line with </> before )
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim() === '</>' && i+1 < lines.length && lines[i+1].trim() === ')') {
    console.log(`Found </> at line ${i+1}`);
    
    const alertModalLines = [
      '',
      '      {/* Alert Modal */}',
      '      {alertModal.show && (',
      '        <div className={styles.alertModalOverlay}>',
      '          <div className={styles.alertModal}>',
      '            <div className={styles.alertModalContent}>',
      '              <p className={styles.alertModalMessage}>{alertModal.message}</p>',
      '              <button ',
      '                className={styles.alertModalButton} ',
      '                onClick={() => setAlertModal({ show: false, message: \'\' })}',
      '              >',
      '                OK',
      '              </button>',
      '            </div>',
      '          </div>',
      '        </div>',
      '      )}'
    ];
    
    // Insert before </>
    lines.splice(i, 0, ...alertModalLines);
    console.log(`Inserted Alert Modal at line ${i+1}`);
    break;
  }
}

fs.writeFileSync('components/CameraButton.tsx', lines.join('\n'), 'utf8');
console.log('Done');
