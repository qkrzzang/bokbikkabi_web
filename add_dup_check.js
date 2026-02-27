const fs = require('fs');
let lines = fs.readFileSync('components/CameraButton.tsx', 'utf8').split('\n');

// Find line 1023 (const contractData = primaryContract)
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const contractData = primaryContract') && i > 1000) {
    console.log(`Found contractData at line ${i+1}`);
    
    const duplicateCheck = [
      '',
      '      // Check duplicate contract_date (only LEASE can have multiple reviews on same date)',
      '      const contractType = transactionTags[0]',
      '      const contractDate = contractData?.contract_date',
      '',
      '      // SELL, RENT, JEONSE can only have 1 review per contract_date',
      '      // Only LEASE can have multiple reviews on same contract_date',
      '      if (contractDate && contractType && contractType !== \'LEASE\') {',
      '        console.log(\'[Duplicate Check] Checking for date:\', contractDate, \'Type:\', contractType)',
      '        ',
      '        const { data: existingReviews, error: duplicateError } = await supabase',
      '          .from(\'agent_reviews\')',
      '          .select(\'id, contract_date, transaction_tag\')',
      '          .eq(\'supabase_user_id\', authUser.id)',
      '          .eq(\'contract_date\', contractDate)',
      '',
      '        if (!duplicateError && existingReviews && existingReviews.length > 0) {',
      '          console.log(\'[Duplicate Check] BLOCKED - Found existing reviews:\', existingReviews)',
      '          setAlertModal({ ',
      '            show: true, ',
      '            message: `A review already exists for contract date ${contractDate}.\\nOnly LEASE transactions can have multiple reviews on the same date.`',
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
    
    lines.splice(i + 1, 0, ...duplicateCheck);
    console.log('Added duplicate check logic');
    break;
  }
}

fs.writeFileSync('components/CameraButton.tsx', lines.join('\n'), 'utf8');
console.log('Successfully added duplicate check for SELL, RENT, JEONSE (LEASE excluded)');
