import { useState, useEffect, useCallback } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';

const useProjectedBalancesFromCloud = (daysToProject = 60) => {
    const [projections, setProjections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // --- START FIX ---
    // The fetch logic is wrapped in useCallback so we can call it on demand.
    const fetchProjections = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const functions = getFunctions();
            const generateProjections = httpsCallable(functions, 'generateProjections');
            const result = await generateProjections({ daysToProject });
            
            const projectionsWithDates = result.data.projections.map(accountProjection => ({
                ...accountProjection,
                projections: accountProjection.projections.map(p => ({
                    ...p,
                    date: new Date(p.date),
                    transactions: p.transactions.map(t => ({...t, date: new Date(t.date)}))
                }))
            }));

            setProjections(projectionsWithDates);
        } catch (err) {
            console.error("Error fetching projections from Cloud Function:", err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [daysToProject]);
    // --- END FIX ---

    useEffect(() => {
        fetchProjections();
    }, [fetchProjections]);

    // --- START FIX ---
    // We now return the `fetchProjections` function so the UI can trigger a refresh.
    return { projections, loading, error, refetch: fetchProjections };
    // --- END FIX ---
};

export default useProjectedBalancesFromCloud;

