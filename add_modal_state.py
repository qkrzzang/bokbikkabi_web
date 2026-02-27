import codecs

with codecs.open('components/CameraButton.tsx', 'r', 'utf-8') as f:
    lines = f.readlines()

# 1. Add alertModal state after hoverRatings
for i in range(len(lines)):
    if 'const [hoverRatings, setHoverRatings]' in lines[i]:
        lines.insert(i+1, '  const [alertModal, setAlertModal] = useState<{ show: boolean; message: string }>({ show: false, message: \'\' })\n')
        print(f'Added alertModal state at line {i+2}')
        break

# 2. Replace alert() calls with setAlertModal()
for i in range(len(lines)):
    line = lines[i]
    
    # 로그인
    if 'alert(' in line and ('로그인' in line or 'login' in line.lower()):
        indent = len(line) - len(line.lstrip())
        lines[i] = ' ' * indent + 'setAlertModal({ show: true, message: \'로그인이 필요합니다.\' })\n'
        print(f'Replaced login alert at line {i+1}')
    
    # 일일 제한
    elif 'dailyLimit' in line and 'alert' in line:
        indent = len(line) - len(line.lstrip())
        lines[i] = ' ' * indent + 'setAlertModal({ show: true, message: `하루에 최대 ${dailyLimit}건의 리뷰만 등록할 수 있습니다.\\n내일 다시 시도해주세요.` })\n'
        print(f'Replaced daily alert at line {i+1}')
    
    # 월간 제한
    elif 'monthlyLimit' in line and 'alert' in line:
        indent = len(line) - len(line.lstrip())
        lines[i] = ' ' * indent + 'setAlertModal({ show: true, message: `한 달에 최대 ${monthlyLimit}건의 리뷰만 등록할 수 있습니다.\\n다음 달에 다시 시도해주세요.` })\n'
        print(f'Replaced monthly alert at line {i+1}')
    
    # 전체 제한
    elif 'userLimit' in line and 'alert' in line:
        indent = len(line) - len(line.lstrip())
        lines[i] = ' ' * indent + 'setAlertModal({ show: true, message: `계정당 최대 ${userLimit}건의 리뷰만 등록할 수 있습니다.` })\n'
        print(f'Replaced user limit alert at line {i+1}')

with codecs.open('components/CameraButton.tsx', 'w', 'utf-8') as f:
    f.writelines(lines)

print('File updated successfully')
