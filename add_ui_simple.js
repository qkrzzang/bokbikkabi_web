const fs = require('fs');
let lines = fs.readFileSync('components/CameraButton.tsx', 'utf8').split('\n');

for (let i = lines.length - 1; i >= 0; i--) {
  if (lines[i].trim() === '</>') {
    console.log(\Found </> at line \\);
    
    const modalUI = \
      {/* Alert Modal */}
      {alertModal.show && (
        <div className={styles.alertModalOverlay}>
          <div className={styles.alertModal}>
            <div className={styles.alertModalContent}>
              <p className={styles.alertModalMessage}>{alertModal.message}</p>
              <button
                className={styles.alertModalButton}
                onClick={() => setAlertModal({ show: false, message: '' })}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}\;
    
    lines.splice(i, 0, modalUI);
    console.log('Added alertModal UI');
    break;
  }
}

fs.writeFileSync('components/CameraButton.tsx', lines.join('\n'), 'utf8');
console.log('Done');
