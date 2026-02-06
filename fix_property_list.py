import codecs

with codecs.open('components/PropertyList.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the backtick-n
content = content.replace('helpfulCount: r.helpful_count || 0,`n          userLevel: userGrade,', 
                          'helpfulCount: r.helpful_count || 0,\n          userLevel: userGrade,')

with codecs.open('components/PropertyList.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Fixed PropertyList.tsx')
