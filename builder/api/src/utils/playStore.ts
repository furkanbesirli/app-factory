import axios from 'axios';

export async function checkAppAvailability(applicationId: string): Promise<'published' | 'removed'> {
    try {
        const url = `https://play.google.com/store/apps/details?id=${applicationId}`;
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            validateStatus: (status: number) => true // Don't throw on 404
        });

        if (response.status === 404) {
            return 'removed';
        }

        // Sometimes Play Store returns 200 but with a "not found" message if it's a soft 404
        if (typeof response.data === 'string' && response.data.includes('We\'re sorry, the requested URL was not found on this server')) {
            return 'removed';
        }

        return 'published';
    } catch (error) {
        console.error(`Error checking Play Store for ${applicationId}:`, error);
        // If we can't reach Google, we don't assume it's removed
        return 'published';
    }
}
