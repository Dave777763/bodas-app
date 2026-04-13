import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { url, eventId } = await req.json();

        if (!url || !eventId) {
            return NextResponse.json({ error: "Missing url or eventId" }, { status: 400 });
        }

        console.log(`Converting YouTube URL: ${url} for event: ${eventId}`);

        // 1. Get list of available instances
        const instancesStr =
            process.env.COBALT_INSTANCES ||
            process.env.COBALT_API_URL ||
            "https://nuko-c.meowing.de/,https://subito-c.meowing.de/,https://cobalt.alpha.wolfy.love/,https://lime.clxxped.lol/,https://api.cobalt.blackcat.sweeux.org/";

        const instances = instancesStr
            .split(",")
            .map((i) => i.trim())
            .filter((i) => i.length > 0);

        console.log(`Trying ${instances.length} Cobalt instances...`);

        let lastError: string | null = null;
        let successData: any = null;
        let usedInstance = "";

        for (const instanceUrl of instances) {
            try {
                console.log(`Attempting conversion with instance: ${instanceUrl}`);
                const cobaltResponse = await fetch(instanceUrl, {
                    method: "POST",
                    headers: {
                        Accept: "application/json",
                        "Content-Type": "application/json",
                        "User-Agent": "Mozilla/5.0 (compatible; VentoWeddingApp/1.0)",
                    },
                    body: JSON.stringify({
                        url: url,
                        downloadMode: "audio",
                        audioFormat: "mp3",
                        audioBitrate: "128",
                    }),
                    signal: AbortSignal.timeout(20000),
                });

                if (cobaltResponse.ok) {
                    const data = await cobaltResponse.json();

                    if (data.status === "error") {
                        console.warn(`Instance ${instanceUrl} returned error:`, data.text);
                        lastError = data.text;
                        continue;
                    }

                    // Valid response: status "redirect" or "tunnel" or "stream"
                    if (data.url) {
                        successData = data;
                        usedInstance = instanceUrl;
                        console.log(`SUCCESS with instance: ${instanceUrl}, status: ${data.status}`);
                        break;
                    }

                    console.warn(`Instance ${instanceUrl} returned no url in:`, data);
                    lastError = "No url in response";
                } else {
                    const errorText = await cobaltResponse.text();
                    console.warn(
                        `Instance ${instanceUrl} failed HTTP ${cobaltResponse.status}: ${errorText.substring(0, 100)}`
                    );
                    lastError = errorText || cobaltResponse.statusText;
                }
            } catch (error: any) {
                console.warn(`Network error with instance ${instanceUrl}:`, error.message);
                lastError = error.message;
            }
        }

        if (!successData?.url) {
            console.error("All Cobalt instances failed. Last error:", lastError);
            return NextResponse.json(
                {
                    error: "No se pudo encontrar un servidor de conversión disponible.",
                    details: lastError || "Todos los servidores fallaron.",
                },
                { status: 502 }
            );
        }

        // 2. Download the audio from Cobalt's temporary URL — server-side with proper headers
        //    This avoids CORS issues and ensures the download has the correct Referer, etc.
        console.log(`Downloading audio from: ${successData.url}`);

        const audioRes = await fetch(successData.url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                Referer: usedInstance,
                Accept: "audio/mpeg, audio/*, */*",
            },
            signal: AbortSignal.timeout(60000), // 60s to download the file
        });

        if (!audioRes.ok) {
            console.error(`Failed to download audio: HTTP ${audioRes.status}`);
            return NextResponse.json(
                { error: `No se pudo descargar el audio: HTTP ${audioRes.status}` },
                { status: 502 }
            );
        }

        const contentType = audioRes.headers.get("content-type") || "audio/mpeg";
        const contentLength = audioRes.headers.get("content-length");

        console.log(`Audio downloaded. Content-Type: ${contentType}, Length: ${contentLength}`);

        // 3. Stream the audio back to the client so it can upload to Firebase Storage
        const audioBuffer = await audioRes.arrayBuffer();

        if (audioBuffer.byteLength === 0) {
            console.error("Downloaded audio is 0 bytes!");
            return NextResponse.json(
                { error: "El audio descargado está vacío. El servidor de conversión puede estar fallando." },
                { status: 502 }
            );
        }

        console.log(`Returning audio: ${audioBuffer.byteLength} bytes`);

        return new NextResponse(audioBuffer, {
            status: 200,
            headers: {
                "Content-Type": "audio/mpeg",
                "Content-Length": String(audioBuffer.byteLength),
                "Content-Disposition": `attachment; filename="music_${eventId}.mp3"`,
            },
        });
    } catch (error: any) {
        console.error("Global conversion error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
