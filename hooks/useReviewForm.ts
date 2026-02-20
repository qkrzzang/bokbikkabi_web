import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase/client'

export function useReviewForm() {
    const [transactionTags, setTransactionTags] = useState<string[]>([])
    const [praiseTags, setPraiseTags] = useState<string[]>([])
    const [regretTags, setRegretTags] = useState<string[]>([])
    const [reviewRatings, setReviewRatings] = useState<Record<string, number>>({})
    const [reviewText, setReviewText] = useState('')

    // Options state
    const [transactionTagOptions, setTransactionTagOptions] = useState<Array<any>>([])
    const [praiseTagOptions, setPraiseTagOptions] = useState<Array<any>>([])
    const [regretTagOptions, setRegretTagOptions] = useState<Array<any>>([])
    const [detailEvaluations, setDetailEvaluations] = useState<Array<any>>([])
    const [detailEvaluationsForLeaseAndSell, setDetailEvaluationsForLeaseAndSell] = useState<Array<any>>([])

    useEffect(() => {
        let isMounted = true
        const fetchReviewCodeDetails = async () => {
            try {
                const { data, error } = await supabase
                    .from('common_code_detail')
                    .select('code_group, code_value, code_name, extra_value1, extra_value2, extra_value3, extra_value4, extra_value5, sort_order, use_yn')
                    .in('code_group', ['TRANSACTION_TYPE', 'PRAISE_TAG', 'REGRET_TAG', 'DETAIL_EVALUATION', 'DETAIL_EVALUATION_FOR_LEASE_AND_SELL'])
                    .order('code_group', { ascending: true })
                    .order('sort_order', { ascending: true })

                if (error || !isMounted) return

                const activeData = (data || []).filter((item: any) => item.use_yn !== 'N')
                setTransactionTagOptions(activeData.filter((item: any) => item.code_group === 'TRANSACTION_TYPE'))
                setPraiseTagOptions(activeData.filter((item: any) => item.code_group === 'PRAISE_TAG'))
                setRegretTagOptions(activeData.filter((item: any) => item.code_group === 'REGRET_TAG'))
                setDetailEvaluations(activeData.filter((item: any) => item.code_group === 'DETAIL_EVALUATION'))
                setDetailEvaluationsForLeaseAndSell(activeData.filter((item: any) => item.code_group === 'DETAIL_EVALUATION_FOR_LEASE_AND_SELL'))
            } catch (error) {
                // ignore
            }
        }
        fetchReviewCodeDetails()
        return () => { isMounted = false }
    }, [])

    // Derived state
    const activeDetailEvaluations = useMemo(() => {
        const selectedTag = transactionTags[0] || ''
        if (selectedTag.includes('임대') || selectedTag.includes('매도')) {
            return detailEvaluationsForLeaseAndSell
        }
        return detailEvaluations
    }, [transactionTags, detailEvaluations, detailEvaluationsForLeaseAndSell])

    const filteredPraiseTagOptions = useMemo(() => {
        const selectedTag = transactionTags[0] || ''
        if (!selectedTag) return praiseTagOptions
        const isBuyOrRent = selectedTag.includes('매수') || selectedTag.includes('임차')
        const isLeaseOrSell = selectedTag.includes('매도') || selectedTag.includes('임대')
        return praiseTagOptions.filter(tag => {
            const v = tag.extra_value1 || 'ALL'
            if (v === 'ALL') return true
            if (isBuyOrRent && v === 'BUY_AND_RENT') return true
            if (isLeaseOrSell && v === 'LEASE_AND_SELL') return true
            return false
        })
    }, [transactionTags, praiseTagOptions])

    const filteredRegretTagOptions = useMemo(() => {
        const selectedTag = transactionTags[0] || ''
        if (!selectedTag) return regretTagOptions
        const isBuyOrRent = selectedTag.includes('매수') || selectedTag.includes('임차')
        const isLeaseOrSell = selectedTag.includes('매도') || selectedTag.includes('임대')
        return regretTagOptions.filter(tag => {
            const v = tag.extra_value1 || 'ALL'
            if (v === 'ALL') return true
            if (isBuyOrRent && v === 'BUY_AND_RENT') return true
            if (isLeaseOrSell && v === 'LEASE_AND_SELL') return true
            return false
        })
    }, [transactionTags, regretTagOptions])

    // Validation
    const isReviewLengthValid = reviewText.trim().length >= 20
    const hasTransactionTag = transactionTags.length > 0
    const hasAtLeastOneTag = praiseTags.length > 0 || regretTags.length > 0
    const allEvaluationsSelected = activeDetailEvaluations.every(evaluation => {
        const rating = reviewRatings[evaluation.code_value]
        return rating && rating > 0
    })
    const isReviewValid = isReviewLengthValid && hasTransactionTag && hasAtLeastOneTag && allEvaluationsSelected

    return {
        transactionTags, setTransactionTags,
        praiseTags, setPraiseTags,
        regretTags, setRegretTags,
        reviewRatings, setReviewRatings,
        reviewText, setReviewText,

        transactionTagOptions,
        praiseTagOptions: filteredPraiseTagOptions,
        regretTagOptions: filteredRegretTagOptions,
        activeDetailEvaluations,

        isReviewValid,
        isReviewLengthValid,
        hasTransactionTag,
        hasAtLeastOneTag,
        allEvaluationsSelected
    }
}
