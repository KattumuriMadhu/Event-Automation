import axios from "axios";

const GRAPH_URL = "https://graph.facebook.com/v19.0";

export async function postToInstagram({ imageUrls, caption }) {
  const igUserId = process.env.INSTAGRAM_BUSINESS_ID;
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;

  if (!igUserId || !accessToken) {
    throw new Error("Instagram credentials missing");
  }

  if (!imageUrls || imageUrls.length === 0) {
    throw new Error("No images provided");
  }

  // Helper function to wait for media to be ready
  const waitForMedia = async (id) => {
    let retries = 0;
    while (retries < 10) { // Increased to 10 retries (approx 30s)
      retries++;
      await new Promise(r => setTimeout(r, 3000));

      try {
        const res = await axios.get(
          `${GRAPH_URL}/${id}?fields=status_code&access_token=${accessToken}`
        );
        if (res.data.status_code === "FINISHED") return true;
        if (res.data.status_code === "ERROR") throw new Error("Media processing failed");
      } catch (e) {
        console.log(`Status check attempt ${retries} failed:`, e.message);
      }
    }
    return false;
  };

  /* ===== SINGLE IMAGE ===== */
  if (imageUrls.length === 1) {
    const mediaRes = await axios.post(
      `${GRAPH_URL}/${igUserId}/media`,
      {
        image_url: imageUrls[0],
        caption,
        access_token: accessToken,
      }
    );

    const creationId = mediaRes.data.id;
    await waitForMedia(creationId);

    const publishRes = await axios.post(
      `${GRAPH_URL}/${igUserId}/media_publish`,
      {
        creation_id: creationId,
        access_token: accessToken,
      }
    );

    /* ===== GET PERMALINK ===== */
    let postUrl = null;
    try {
      const permalinkRes = await axios.get(
        `${GRAPH_URL}/${publishRes.data.id}?fields=permalink&access_token=${accessToken}`
      );
      postUrl = permalinkRes.data.permalink;
    } catch (err) {
      console.warn("Permalink fetch failed:", err.message);
    }

    return { success: true, type: "single", postUrl };
  }

  /* ===== CAROUSEL (2–10 images) ===== */
  const children = [];

  for (const url of imageUrls.slice(0, 10)) {
    const res = await axios.post(
      `${GRAPH_URL}/${igUserId}/media`,
      {
        image_url: url,
        is_carousel_item: true,
        access_token: accessToken,
      }
    );
    children.push(res.data.id);
  }

  // Create Carousel Container
  const carouselRes = await axios.post(
    `${GRAPH_URL}/${igUserId}/media`,
    {
      media_type: "CAROUSEL",
      children,
      caption,
      access_token: accessToken,
    }
  );

  const creationId = carouselRes.data.id;
  await waitForMedia(creationId);

  // If still not ready after waiting, we try to publish anyway (it might work or fail)
  const publishRes = await axios.post(
    `${GRAPH_URL}/${igUserId}/media_publish`,
    {
      creation_id: creationId,
      access_token: accessToken,
    }
  );

  /* ===== GET PERMALINK ===== */
  let postUrl = null;
  try {
    const permalinkRes = await axios.get(
      `${GRAPH_URL}/${publishRes.data.id}?fields=permalink&access_token=${accessToken}`
    );
    postUrl = permalinkRes.data.permalink;
  } catch (err) {
    console.warn("Permalink fetch failed:", err.message);
  }

  return { success: true, type: "carousel", postUrl };
}

