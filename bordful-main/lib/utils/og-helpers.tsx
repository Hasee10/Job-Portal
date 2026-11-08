import { ImageResponse } from "next/og";
import config from "@/config";
import {
  DEFAULT_LOGO_HEIGHT,
  DEFAULT_LOGO_WIDTH,
} from "@/lib/constants/defaults";
import {
  getFontFamilyCSS,
  getFontInfo,
  loadGoogleFontData,
  prepareImageResponseFonts,
} from "@/lib/utils/font-utils";
import { fetchImageAsDataURI } from "@/lib/utils/image-utils";
import {
  createLinearGradient,
  hexToRGBA,
  type ProcessedOGConfig,
} from "@/lib/utils/og-config";

export interface LogoConfig {
  height?: number | string;
  show?: boolean;
  src?: string;
  width?: number | string;
}

export interface ProcessedLogoConfig {
  dataUri: string;
  enabled: boolean;
  height: number;
  width: number;
}

/**
 * Process logo configuration and fetch image data
 */
export async function processLogo(
  logoConfig: LogoConfig
): Promise<ProcessedLogoConfig> {
  const enabled = logoConfig.show !== false;
  const src = logoConfig.src || "";
  const height =
    typeof logoConfig.height === "number"
      ? logoConfig.height
      : DEFAULT_LOGO_HEIGHT;
  const width =
    typeof logoConfig.width === "number"
      ? logoConfig.width
      : DEFAULT_LOGO_WIDTH;

  let dataUri = "";
  if (enabled && src) {
    dataUri = await fetchImageAsDataURI(src, config.url);
  }

  return { dataUri, enabled, height, width };
}

/**
 * Prepare all assets needed for OG image generation
 */
export async function prepareOGAssets(parsedConfig: ProcessedOGConfig) {
  const fontInfo = getFontInfo(parsedConfig.fontFamily);
  let fontData: ArrayBuffer | null = null;

  // Load font data if needed
  if (fontInfo.nameToLoad) {
    fontData = await loadGoogleFontData(
      fontInfo.nameToLoad,
      `${parsedConfig.siteTitle} ${parsedConfig.siteDescription}`
    );
  }

  // Prepare fonts array for ImageResponse
  const imageResponseFonts = prepareImageResponseFonts(
    parsedConfig.fontFamily,
    fontData,
    `${parsedConfig.siteTitle} ${parsedConfig.siteDescription}`
  );

  // Get font family CSS
  const fontFamilyCSS = getFontFamilyCSS(
    parsedConfig.fontFamily,
    fontInfo,
    imageResponseFonts
  );

  return { fontFamilyCSS, imageResponseFonts };
}

/**
 * Prepare background image for OG generation
 */
export async function prepareBackgroundImage(
  backgroundImage?: string | null
): Promise<string> {
  if (!backgroundImage) {
    return "";
  }

  return await fetchImageAsDataURI(backgroundImage, config.url);
}

/**
 * Create the complete ImageResponse for OG image
 */
export async function createOGImageResponse(
  parsedConfig: ProcessedOGConfig,
  fontFamilyCSS: string,
  imageResponseFonts: any[],
  bgImageDataUri: string,
  logoConfig: ProcessedLogoConfig
): Promise<ImageResponse> {
  const gradientCSS = parsedConfig.gradientEnabled
    ? createLinearGradient(
        parsedConfig.gradientColor,
        parsedConfig.gradientAngle,
        parsedConfig.gradientStartOpacity,
        parsedConfig.gradientEndOpacity
      )
    : "";

  const backgroundColorRGBA = hexToRGBA(
    parsedConfig.backgroundColor,
    parsedConfig.backgroundOpacity
  );

  const SHARED_STYLES = {
    DIMENSIONS: {
      CONTENT_WIDTH: 1080,
      HEIGHT: 630,
      PADDING: 60,
      WIDTH: 1200,
    },
    FONTS: {
      DESCRIPTION_LINE_HEIGHT: 1.5,
      DESCRIPTION_SIZE: 30,
      DESCRIPTION_WEIGHT: 400,
      TITLE_LINE_HEIGHT: 1.2,
      TITLE_SIZE: 60,
      TITLE_WEIGHT: 800,
    },
    Z_INDEX: {
      CONTENT: 10,
    },
  };

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: `${SHARED_STYLES.DIMENSIONS.HEIGHT}px`,
        overflow: "hidden",
        position: "relative",
        width: `${SHARED_STYLES.DIMENSIONS.WIDTH}px`,
      }}
    >
      {/* Background Image Layer */}
      {Boolean(bgImageDataUri) && (
        <img
          alt="Background"
          height={SHARED_STYLES.DIMENSIONS.HEIGHT}
          src={bgImageDataUri}
          style={{
            height: "100%",
            left: 0,
            objectFit: "cover",
            position: "absolute",
            top: 0,
            width: "100%",
          }}
          width={SHARED_STYLES.DIMENSIONS.WIDTH}
        />
      )}

      {/* Background Color Overlay */}
      <div
        style={{
          backgroundColor: backgroundColorRGBA,
          height: "100%",
          left: 0,
          position: "absolute",
          top: 0,
          width: "100%",
        }}
      />

      {/* Gradient Overlay */}
      {parsedConfig.gradientEnabled && (
        <div
          style={{
            background: gradientCSS,
            height: "100%",
            left: 0,
            position: "absolute",
            top: 0,
            width: "100%",
          }}
        />
      )}

      {/* Content Container */}
      <div
        style={{
          alignItems: "flex-start",
          color: "white",
          display: "flex",
          flexDirection: "column",
          fontFamily: fontFamilyCSS,
          height: "100%",
          justifyContent: "space-between",
          padding: `${SHARED_STYLES.DIMENSIONS.PADDING}px`,
          position: "relative",
          textAlign: "left",
          width: "100%",
          zIndex: SHARED_STYLES.Z_INDEX.CONTENT,
        }}
      >
        {/* Logo Image */}
        {Boolean(logoConfig.dataUri) && (
          <img
            alt={`${config.title} Logo`}
            height={logoConfig.height}
            src={logoConfig.dataUri}
            style={{
              height: `${logoConfig.height}px`,
              objectFit: "contain",
              width: `${logoConfig.width}px`,
            }}
            width={logoConfig.width}
          />
        )}

        {/* Text container for title and description */}
        <div
          style={{
            alignItems: "flex-start",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <h1
            style={{
              color: parsedConfig.titleColor,
              fontSize: `${SHARED_STYLES.FONTS.TITLE_SIZE}px`,
              fontWeight: SHARED_STYLES.FONTS.TITLE_WEIGHT,
              lineHeight: SHARED_STYLES.FONTS.TITLE_LINE_HEIGHT,
              margin: "0 0 20px 0",
              maxWidth: `${SHARED_STYLES.DIMENSIONS.CONTENT_WIDTH}px`,
              textAlign: "left",
            }}
          >
            {parsedConfig.siteTitle}
          </h1>
          <p
            style={{
              color: parsedConfig.descriptionColor,
              fontSize: `${SHARED_STYLES.FONTS.DESCRIPTION_SIZE}px`,
              fontWeight: SHARED_STYLES.FONTS.DESCRIPTION_WEIGHT,
              lineHeight: SHARED_STYLES.FONTS.DESCRIPTION_LINE_HEIGHT,
              margin: 0,
              maxWidth: `${SHARED_STYLES.DIMENSIONS.CONTENT_WIDTH}px`,
              textAlign: "left",
            }}
          >
            {parsedConfig.siteDescription}
          </p>
        </div>
      </div>
    </div>,
    {
      fonts: imageResponseFonts.length > 0 ? imageResponseFonts : undefined,
      // Site-wide OG image is effectively static - let the CDN serve repeat
      // hits instead of re-rendering per request (same rationale as the
      // per-job OG route in og-job-helpers.tsx).
      headers: {
        "Cache-Control":
          "public, immutable, no-transform, max-age=86400, stale-while-revalidate=604800",
      },
      height: SHARED_STYLES.DIMENSIONS.HEIGHT,
      width: SHARED_STYLES.DIMENSIONS.WIDTH,
    }
  );
}
