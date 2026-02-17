# CameraButton.tsx 리팩토링 적용 가이드

백업 파일: `components/CameraButton.tsx.backup`

## 단계 1: startCamera 함수 교체

**위치: 591-640번 줄**

**삭제할 코드 (591-640번 줄):**
```typescript
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      })
      streamRef.current = stream
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        
        // 비디오가 로드될 때까지 대기
        await new Promise<void>((resolve, reject) => {
          if (!videoRef.current) {
            reject(new Error('Video element not found'))
            return
          }
          
          videoRef.current.onloadedmetadata = () => {
            if (videoRef.current) {
              videoRef.current.play()
                .then(() => {
                  console.log('[카메라] 비디오 재생 시작')
                  resolve()
                })
                .catch(reject)
            }
          }
          
          // 타임아웃 설정 (5초)
          setTimeout(() => reject(new Error('Video load timeout')), 5000)
        })
        
        setMode('camera')
      }
    } catch (error) {
      console.error('카메라 접근 실패:', error)
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류'
      if (errorMessage.includes('Permission denied') || errorMessage.includes('NotAllowedError')) {
        alert('카메라 접근 권한이 필요합니다. 브라우저 설정에서 카메라 권한을 허용해주세요.')
      } else if (errorMessage.includes('NotFoundError') || errorMessage.includes('not found')) {
        alert('카메라를 찾을 수 없습니다. 기기에 카메라가 연결되어 있는지 확인해주세요.')
      } else {
        alert(`카메라 실행 중 오류가 발생했습니다: ${errorMessage}`)
      }
    }
  }
```

**추가할 코드:**
```typescript
  const startCamera = async () => {
    if (!videoRef.current) return
    
    try {
      const stream = await startCameraStream(videoRef.current)
      streamRef.current = stream
      setMode('camera')
    } catch (error: any) {
      console.error('카메라 접근 실패:', error)
      alert(error.message)
    }
  }
```

**줄어든 코드: 50줄 → 11줄**

---

## 단계 2: stopCamera 함수 교체

**위치: 642-647번 줄**

**삭제할 코드:**
```typescript
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }
```

**추가할 코드:**
```typescript
  const stopCamera = () => {
    stopCameraStream(streamRef.current)
    streamRef.current = null
  }
```

**줄어든 코드: 6줄 → 4줄**

---

## 단계 3: capturePhoto 함수 교체

**위치: 649-672번 줄**

**삭제할 코드:**
```typescript
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current
      const video = videoRef.current
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(video, 0, 0)
        const imageData = canvas.toDataURL('image/jpeg')
        setCapturedImage(imageData)
        
        // Canvas를 Blob으로 변환하여 File 객체 생성
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'captured-image.jpg', { type: 'image/jpeg' })
            setOriginalFile(file)
          }
        }, 'image/jpeg', 0.9)
        
        stopCamera()
        setMode('upload')
      }
    }
  }
```

**추가할 코드:**
```typescript
  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return
    
    try {
      const { imageData, file } = capturePhotoFromVideo(
        videoRef.current,
        canvasRef.current,
        0.9
      )
      
      setCapturedImage(imageData)
      const capturedFile = await file
      if (capturedFile) {
        setOriginalFile(capturedFile)
      }
      
      stopCamera()
      setMode('upload')
    } catch (error) {
      console.error('사진 캡처 실패:', error)
      alert('사진 캡처에 실패했습니다.')
    }
  }
```

**줄어든 코드: 24줄 → 20줄**

---

## 단계 4: handleImageSubmit 함수 교체 (가장 중요!)

**위치: 674-964번 줄 (총 290줄!)**

**전체 함수를 아래 코드로 교체:**

```typescript
  const handleImageSubmit = async () => {
    if (!originalFile) {
      alert('파일을 찾을 수 없습니다.')
      return
    }

    setIsLoading(true)
    setOcrError(null)
    setAiError(null)
    setAiResult(null)

    try {
      // Step 1 & 2: OCR + AI 분석 처리 (유틸리티 사용)
      const result = await processContractFile(originalFile)
      
      setOcrResult(result.ocrResult.ocrData)
      setAiResult(result.aiResult.validContracts)
      
      // Step 3: 중개사 검증
      const contractsToProcess = Array.isArray(result.aiResult.validContracts) 
        ? result.aiResult.validContracts 
        : [result.aiResult.validContracts]
      
      if (contractsToProcess.length > 0) {
        const addresses: Record<string, { road_address: string; lot_address: string }> = {}
        const pendingSelections: PendingAgentSelection[] = []
        
        // 모든 계약서에 대해 중개사 검증
        for (let i = 0; i < contractsToProcess.length; i++) {
          const contract = contractsToProcess[i]
          const key = `${i}`
          
          const contractAgentNumber = getContractAgentNumber(contract)
          const contractAgentName = getContractAgentName(contract)
          
          console.log(`[계약서 ${i}] 중개사 정보:`, { 
            agent_number: contractAgentNumber, 
            agent_name: contractAgentName
          })
          
          // 중개사 검증 (유틸리티 사용)
          const verificationResult = await verifyAgentFromContract(contract)
          
          if (verificationResult.type === 'exact' && verificationResult.agent) {
            // 정확 일치 1건 - 확인 팝업용 준비
            pendingSelections.push({
              contractIndex: i,
              agentName: verificationResult.agent.agent_name,
              agentNumber: verificationResult.agent.agent_number,
              reason: 'exact',
              agents: [verificationResult.agent]
            })
          } else if (verificationResult.type === 'multiple' && verificationResult.agents) {
            // 여러 건 발견 - 선택 팝업
            pendingSelections.push({
              contractIndex: i,
              agentName: contractAgentName,
              agentNumber: contractAgentNumber,
              reason: 'multiple',
              agents: verificationResult.agents
            })
          } else if (verificationResult.type === 'fuzzy' && verificationResult.agents) {
            // 유사 검색 결과
            pendingSelections.push({
              contractIndex: i,
              agentName: contractAgentName,
              agentNumber: contractAgentNumber,
              reason: 'fuzzy',
              agents: verificationResult.agents
            })
          } else {
            // 찾지 못함
            console.log(`[계약서 ${i}] 중개사 찾지 못함`)
          }
        }
        
        setAgentAddresses(addresses)
        
        console.log(`[검증] 총 ${pendingSelections.length}개 계약서에 대한 선택 필요`)
        
        // 첫 번째 선택이 필요한 경우 팝업 표시
        if (pendingSelections.length > 0) {
          const firstSelection = pendingSelections[0]
          
          // 정확 일치 1건인 경우 바로 확인 팝업
          if (firstSelection.reason === 'exact' && firstSelection.agents.length === 1) {
            console.log(`[검증] ✅ 정확 일치 1건 → 확인 팝업`)
            setConfirmingAgent({
              agent: firstSelection.agents[0],
              contractIndex: firstSelection.contractIndex
            })
            setPendingAgentSelection(firstSelection)
            setShowConfirmSelection(true)
          } else {
            // 여러 건 또는 유사 검색 - 선택 팝업
            console.log(`[검증] 🔍 선택 팝업 표시`)
            setPendingAgentSelection(firstSelection)
            setShowAgentSelection(true)
          }
        } else {
          console.log(`[검증] ⚠️ 후보 0건 → 검증 결과만 표시`)
        }
      }
      
      setMode('result')
    } catch (error: any) {
      console.error('계약서 처리 오류:', error)
      
      if (error.message?.includes('Not a real estate contract') || 
          error.message?.includes('계약서가 아닌')) {
        setAiError('계약서가 아닌 문서입니다. 부동산 계약서를 다시 올려주세요.')
      } else if (error.message?.includes('timed out') || 
                 error.message?.includes('시간이 초과')) {
        setOcrError(error.message)
      } else {
        setOcrError(error.message || 'OCR 처리 중 오류가 발생했습니다.')
      }
      
      setMode('result')
    } finally {
      setIsLoading(false)
    }
  }
```

**줄어든 코드: 290줄 → 120줄 (170줄 감소!)**

---

## 단계 5: 필요 없는 함수들 삭제

이제 다음 함수들은 유틸리티로 대체되었으므로 **삭제해도 됩니다** (선택사항):

1. `normalizeAgentNumber` 함수
2. `normalizeText` 함수  
3. `calculateSimilarity` 함수
4. `getMatchScore` 함수
5. `fetchExactAgent` 함수
6. `fetchByNameAndNumber` 함수

**주의**: `getContractAgentNumber`, `getContractAgentName`, `getContractAgentAddress` 함수는 컴포넌트 내에서도 계속 사용되므로 삭제하지 마세요!

---

## 적용 후 확인사항

1. **타입 에러 확인**: 개발 서버 재시작 후 타입 에러가 없는지 확인
2. **기능 테스트**:
   - 카메라 촬영 테스트
   - 갤러리에서 이미지 선택 테스트
   - OCR 처리 테스트
   - 중개사 검증 테스트

---

## 리팩토링 효과

- **총 약 330줄 코드 감소** (2049줄 → 약 1720줄)
- **가독성 대폭 향상**
- **유지보수성 개선**
- **테스트 용이성 증가**
- **재사용 가능한 유틸리티 확보**

---

## 문제 발생 시

백업 파일로 복원:
```bash
cp components/CameraButton.tsx.backup components/CameraButton.tsx
```
