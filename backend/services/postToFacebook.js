import axios from "axios";

const GRAPH_URL = "https://graph.facebook.com/v19.0";

export async function postToFacebook({ imageUrls, caption }) {
    const pageId = process.env.FACEBOOK_PAGE_ID;
    const pageAccessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN || process.env.FACEBOOK_ACCESS_TOKEN; // Fallback

    if (!pageId || !pageAccessToken) {
        throw new Error("Facebook credentials (PAGE_ID or PAGE_ACCESS_TOKEN) missing");
    }

    if (!imageUrls || imageUrls.length === 0) {
        throw new Error("No images provided");
    }

    /* ===== SINGLE PHOTO ===== */
    if (imageUrls.length === 1) {
        const res = await axios.post(
            `${GRAPH_URL}/${pageId}/photos`,
            {
                url: imageUrls[0],
                message: caption,
                access_token: pageAccessToken,
            }
        );

        // Get Permalink
        let postUrl = `https://www.facebook.com/${res.data.post_id}`; // Default fallback
        try {
            const permalinkRes = await axios.get(
                `${GRAPH_URL}/${res.data.post_id}?fields=permalink_url&access_token=${pageAccessToken}`
            );
            postUrl = permalinkRes.data.permalink_url || postUrl;
        } catch (err) {
            console.warn("Facebook permalink fetch failed:", err.message);
        }

        return { success: true, type: "single", postUrl, id: res.data.id, postId: res.data.post_id };
    }

    /* ===== MULTI-PHOTO (ALBUM/FEED) ===== */
    // Facebook doesn't have a direct "carousel" API for Pages like Instagram without complex app review for standard posts used in ads usually.
    // Instead, we post multiple photos to the page feed as a multi-photo post.
    // Method: Post each photo with `published=false` to get IDs, then publish a feed story attaching them.
    // OR simpler: Just post them one by one? No, valid multi-photo post is better.

    // Actually, for Pages, the common way is to post photos to the Feed.
    // The 'feed' endpoint supports 'attached_media'

    const attachedMedia = [];

    for (const url of imageUrls.slice(0, 10)) { // Max 10 usually
        // Upload photo without publishing
        const photoRes = await axios.post(
            `${GRAPH_URL}/${pageId}/photos`,
            {
                url: url,
                published: false,
                access_token: pageAccessToken,
            }
        );
        attachedMedia.push({ media_fbid: photoRes.data.id });
    }

    const feedRes = await axios.post(
        `${GRAPH_URL}/${pageId}/feed`,
        {
            message: caption,
            attached_media: attachedMedia,
            access_token: pageAccessToken,
        }
    );

    let postUrl = `https://www.facebook.com/${feedRes.data.id}`;
    try {
        const permalinkRes = await axios.get(
            `${GRAPH_URL}/${feedRes.data.id}?fields=permalink_url&access_token=${pageAccessToken}`
        );
        postUrl = permalinkRes.data.permalink_url || postUrl;
    } catch (err) {
        console.warn("Facebook permalink fetch failed:", err.message);
    }

    return { success: true, type: "multi", postUrl, id: feedRes.data.id };
}
