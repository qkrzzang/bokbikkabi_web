const fs = require('fs');
let lines = fs.readFileSync('components/CameraButton.tsx', 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('if (!totalError && (totalCount || 0) >= userLimit)')) {
    console.log(`Found userLimit check at line ${i+1}`);
    
    let insertIdx = i;
    for (let j = i; j < i + 10; j++) {
      if (lines[j].includes('return') && lines[j-1].includes('alert')) {
        insertIdx = j + 1;
        break;
      }
    }
    
    console.log(`Will insert after line ${insertIdx+1}`);
    
    const duplicateCheckCode = [
      '',
      '      // Check duplicate contract_date (exclude LEASE)',
      '      const contractData = primaryContract',
      '      const contractType = transactionTags[0]',
      '      const contractDate = contractData?.contract_date',
      '',
      '      if (contractDate && contractType && contractType !== \'LEASE\') {',
      '        console.log(\'[Duplicate Check] Date:\', contractDate, \'Type:\', contractType)',
      '        ',
      '        const { data: existingReviews, error: duplicateError } = await supabase',
      '          .from(\'agent_reviews\')',
      '          .select(\'id, contract_date, transaction_tag\')',
      '          .eq(\'supabase_user_id\', authUser.id)',
      '          .eq(\'contract_date\', contractDate)',
      '          .neq(\'transaction_tag\', \'LEASE\')',
      '',
      '        if (!duplicateError && existingReviews && existingReviews.length > 0) {',
      '          console.log(\'[Duplicate Check] Found existing:\', existingReviews)',
      '          setAlertModal({ ',
      '            show: true, ',
      '            message: `?대떦 怨꾩빟?쇱옄(${contractDate})???대? 由щ럭媛 ?깅줉?섏뼱 ?덉뒿?덈떎.\\nLEASE瑜??쒖쇅?섍퀬???숈씪??怨꾩빟?쇱옄??以묐났 ?깅줉??遺덇??ν빀?덈떎.`',
      '          })',
      '          return',
      '        }',
      '        ',
      '        console.log(\'[Duplicate Check] Passed - No duplicates\')',
      '      }',
      ''
    ];
    
    lines.splice(insertIdx, 0, ...duplicateCheckCode);
    console.log(`Inserted duplicate check code at line ${insertIdx+1}`);
    break;
  }
}

fs.writeFileSync('components/CameraButton.tsx', lines.join('\n'), 'utf8');
console.log('Added contract date duplicate check');
