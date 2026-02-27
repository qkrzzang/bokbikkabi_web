const fs = require('fs');
let lines = fs.readFileSync('components/CameraButton.tsx', 'utf8').split('\n');

// Find duplicate check section
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('// Check duplicate contract_date (exclude LEASE)')) {
    console.log(`Found duplicate check at line ${i+1}`);
    
    // Find the end of this block
    let endIdx = i;
    for (let j = i; j < i + 30; j++) {
      if (lines[j].includes('console.log(\'[Duplicate Check] Passed - No duplicates\')')) {
        endIdx = j;
        break;
      }
    }
    
    console.log(`Block ends at line ${endIdx+1}`);
    
    const newDuplicateCheck = [
      '      // Check duplicate contract_date (LEASE can have multiple reviews on same date)',
      '      const contractData = primaryContract',
      '      const contractType = transactionTags[0]',
      '      const contractDate = contractData?.contract_date',
      '',
      '      // Only LEASE can have multiple reviews on same contract_date',
      '      if (contractDate && contractType && contractType !== \'LEASE\') {',
      '        console.log(\'[Duplicate Check] Checking for date:\', contractDate, \'Type:\', contractType)',
      '        ',
      '        const { data: existingReviews, error: duplicateError } = await supabase',
      '          .from(\'agent_reviews\')',
      '          .select(\'id, contract_date, transaction_tag\')',
      '          .eq(\'supabase_user_id\', authUser!.id)',
      '          .eq(\'contract_date\', contractDate)',
      '',
      '        if (!duplicateError && existingReviews && existingReviews.length > 0) {',
      '          console.log(\'[Duplicate Check] BLOCKED - Found existing reviews:\', existingReviews)',
      '          setAlertModal({ ',
      '            show: true, ',
      '            message: `A review already exists for contract date ${contractDate}.\\nOnly LEASE can have multiple reviews on the same date.`',
      '          })',
      '          return',
      '        }',
      '        ',
      '        console.log(\'[Duplicate Check] PASSED - No duplicates found\')',
      '      } else if (contractDate && contractType === \'LEASE\') {',
      '        console.log(\'[Duplicate Check] SKIPPED - LEASE can have multiple reviews\')',
      '      }',
      ''
    ];
    
    lines.splice(i, endIdx - i + 1, ...newDuplicateCheck);
    console.log('Updated duplicate check logic');
    break;
  }
}

fs.writeFileSync('components/CameraButton.tsx', lines.join('\n'), 'utf8');
console.log('Duplicate check improved - SELL, RENT, JEONSE = 1 per date, LEASE = unlimited');
