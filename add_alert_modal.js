const fs = require('fs');
let content = fs.readFileSync('components/CameraButton.tsx', 'utf8');

// Add alert modal before closing tags
const insertPoint = '      <input\n        ref={fileInputRef}\n        type="file"\n        accept="image/*"\n        onChange={handleFileChange}\n        style={{ display: \'none\' }}\n      />\n    </>\n  )\n}';

const alertModalCode = `      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

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
      )}
    </>
  )
}`;

if (content.includes(insertPoint)) {
  content = content.replace(insertPoint, alertModalCode);
  fs.writeFileSync('components/CameraButton.tsx', content, 'utf8');
  console.log('Alert Modal added');
} else {
  console.log('Insert point not found');
}
