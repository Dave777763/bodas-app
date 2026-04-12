import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { url, eventId } = await req.json();

        if (!url || !eventId) {
            return NextResponse.json({ error: "Missing url or eventId" }, { status: 400 });
        }

        console.log(`Converting YouTube URL: ${url} for event: ${eventId}`);

        // 1. Get list of available instances from environment
        const instancesStr = process.env.COBALT_INSTANCES || process.env.COBALT_API_URL || "https://api.cobalt.tools/";
        const instances = instancesStr.split(",").map(i => i.trim()).filter(i => i.length > 0);
        
        console.log(`Trying ${instances.length} Cobalt instances...`);

        let lastError = null;
        let successData = null;

        for (const instanceUrl of instances) {
            try {
                console.log(`Attempting conversion with instance: ${instanceUrl}`);
                const cobaltResponse = await fetch(instanceUrl, {
                    method: "POST",
                    headers: {
                        "Accept": "application/json",
                        "Content-Type": "application/json",
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
                    },
                    body: JSON.stringify({
                        url: url,
                        audioBitrate: "128",
                        audioFormat: "mp3",
                        downloadMode: "audio",
                        videoQuality: "720",
                        filenameStyle: "pretty"
                    }),
                    signal: AbortSignal.timeout(20000) // 20s timeout per instance
                });

                if (cobaltResponse.ok) {
                    successData = await cobaltResponse.json();
                    if (successData.status === "error") {
                        console.warn(`Instance ${instanceUrl} returned an error status in JSON:`, successData.text);
                        lastError = successData.text;
                        successData = null;
                        continue; // Try next instance
                    }
                    console.log(`SUCCESS with instance: ${instanceUrl}`);
                    break; // Exit loop on success
                } else {
                    const errorText = await cobaltResponse.text();
                    console.warn(`Instance ${instanceUrl} failed with status ${cobaltResponse.status}: ${errorText.substring(0, 100)}`);
                    lastError = errorText || cobaltResponse.statusText;
                }
            } catch (error: any) {
                console.warn(`Network error with instance ${instanceUrl}:`, error.message);
                lastError = error.message;
            }
        }

        if (!successData) {
            console.error("All Cobalt instances failed.");
            return NextResponse.json({ 
                error: "No se pudo encontrar un servidor de conversión disponible en este momento.",
                details: lastError || "Todos los servidores fallaron.",
                code: 500
            }, { status: 500 });
        }

        const downloadUrl = successData.url;
        if (!downloadUrl) {
            return NextResponse.json({ error: "No download URL returned from Cobalt" }, { status: 500 });
        }

        return NextResponse.json({ 
            success: true, 
            downloadUrl: downloadUrl,
            status: successData.status,
            filename: `music_${eventId}.mp3`
        });

    } catch (error: any) {
        console.error("Global conversion error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
