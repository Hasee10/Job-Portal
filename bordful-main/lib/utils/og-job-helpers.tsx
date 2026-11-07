import { ImageResponse } from "next/og";
import config from "@/config";
import type { MinimalJob } from "@/lib/utils/job-validation";
import {
  createLinearGradient,
  hexToRGBA,
  type ProcessedOGConfig,
} from "@/lib/utils/og-config";

export interface JobProcessedOGConfig extends ProcessedOGConfig {
  companyColor: string;
  companyName: string;
  jobTitle: string;
  workplaceType: string;
}

/**
 * Create job-specific OG configuration
 */
export function createJobOGConfig(job: MinimalJob): JobProcessedOGConfig {
  const ogJobConfig = config.og?.jobs || {};

  return {
    backgroundColor:
      ogJobConfig.backgroundColor || config.ui.heroBackgroundColor || "#005450",
    backgroundImage: ogJobConfig.backgroundImage || null,
    backgroundOpacity:
      ogJobConfig.backgroundOpacity === undefined
        ? 0.8
        : ogJobConfig.backgroundOpacity,
    companyColor:
      ogJobConfig.companyColor || config.ui.heroTitleColor || "#FFFFFF",
    companyName: job.company,
    descriptionColor:
      ogJobConfig.detailsColor || config.ui.heroSubtitleColor || "#FFFFFF",
    fontFamily: ogJobConfig.font?.family || config.font.family || "geist",
    gradientAngle:
      ogJobConfig.gradient?.angle === undefined
        ? 0
        : ogJobConfig.gradient.angle,
    gradientColor:
      ogJobConfig.gradient?.color ||
      ogJobConfig.backgroundColor ||
      config.ui.heroBackgroundColor ||
      "#005450",
    gradientEnabled: (ogJobConfig.gradient?.enabled as boolean) !== false,
    gradientEndOpacity:
      ogJobConfig.gradient?.endOpacity === undefined
        ? 1
        : ogJobConfig.gradient.endOpacity,
    gradientStartOpacity:
      ogJobConfig.gradient?.startOpacity === undefined
        ? 0
        : ogJobConfig.gradient.startOpacity,
    jobTitle: job.title,
    siteDescription: `Apply for ${job.type} position - ${job.workplace_type}`,
    siteTitle: `${job.title} at ${job.company}`,
    titleColor: ogJobConfig.titleColor || config.ui.heroTitleColor || "#FFFFFF",
    workplaceType: job.workplace_type,
  };
}

/**
 * Create the complete ImageResponse for job OG image
 */
export async function createJobOGImageResponse(
  config: JobProcessedOGConfig,
  fontFamilyCSS: string,
  imageResponseFonts: any[],
  bgImageDataUri: string,
  logoDataUri: string
): Promise<ImageResponse> {
  const gradientCSS = config.gradientEnabled
    ? createLinearGradient(
        config.gradientColor,
        config.gradientAngle,
        config.gradientStartOpacity,
        config.gradientEndOpacity
      )
    : "";

  const backgroundColorRGBA = hexToRGBA(
    config.backgroundColor,
    config.backgroundOpacity
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
      {config.gradientEnabled && (
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
        {Boolean(logoDataUri) && (
          <img
            alt={`${config.siteTitle} Logo`}
            height={100}
            src={logoDataUri}
            style={{
              height: "100px",
              objectFit: "contain",
              width: "100px",
            }}
            width={100}
          />
        )}

        {/* Text container for job details */}
        <div
          style={{
            alignItems: "flex-start",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <h1
            style={{
              color: config.titleColor,
              fontSize: `${SHARED_STYLES.FONTS.TITLE_SIZE}px`,
              fontWeight: SHARED_STYLES.FONTS.TITLE_WEIGHT,
              lineHeight: SHARED_STYLES.FONTS.TITLE_LINE_HEIGHT,
              margin: "0 0 10px 0",
              maxWidth: `${SHARED_STYLES.DIMENSIONS.CONTENT_WIDTH}px`,
              textAlign: "left",
            }}
          >
            {config.jobTitle}
          </h1>
          <p
            style={{
              color: config.companyColor,
              fontSize: `${SHARED_STYLES.FONTS.DESCRIPTION_SIZE}px`,
              fontWeight: SHARED_STYLES.FONTS.DESCRIPTION_WEIGHT,
              lineHeight: SHARED_STYLES.FONTS.DESCRIPTION_LINE_HEIGHT,
              margin: "0 0 20px 0",
              maxWidth: `${SHARED_STYLES.DIMENSIONS.CONTENT_WIDTH}px`,
              textAlign: "left",
            }}
          >
            at {config.companyName}
          </p>
          <p
            style={{
              color: config.descriptionColor,
              fontSize: `${SHARED_STYLES.FONTS.DESCRIPTION_SIZE}px`,
              fontWeight: SHARED_STYLES.FONTS.DESCRIPTION_WEIGHT,
              lineHeight: SHARED_STYLES.FONTS.DESCRIPTION_LINE_HEIGHT,
              margin: 0,
              maxWidth: `${SHARED_STYLES.DIMENSIONS.CONTENT_WIDTH}px`,
              textAlign: "left",
            }}
          >
            {config.siteDescription}
          </p>
        </div>
      </div>
    </div>,
    {
      fonts: imageResponseFonts.length > 0 ? imageResponseFonts : undefined,
      // Each render does a DB read + Google Font fetch + Satori image render
      // on the nodejs runtime - expensive and, uncached, a real cost/DoS
      // amplification surface (a crawler or attacker hitting many job slugs
      // forces repeated full renders). OG images for a given job are
      // effectively static, so let the CDN serve repeat hits: cache for a
      // day, allow a week of stale-while-revalidate.
      headers: {
        "Cache-Control":
          "public, immutable, no-transform, max-age=86400, stale-while-revalidate=604800",
      },
      height: SHARED_STYLES.DIMENSIONS.HEIGHT,
      width: SHARED_STYLES.DIMENSIONS.WIDTH,
    }
  );
}
