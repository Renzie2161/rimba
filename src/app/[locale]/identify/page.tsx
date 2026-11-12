import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { plantNetManifest } from "@/features/identification/models/plantnet-resnet18.manifest";
import IdentifyWorkspace from "./identify-workspace";
import styles from "./identify.module.css";
import { socialMetadata } from "@/lib/social-metadata";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "identify" });
  return socialMetadata({ locale, title: t("title"), path: "/identify" });
}

export default async function IdentifyPage() {
  const t = await getTranslations("identify");

  return (
    <main className={styles.page} id="main">
      <header className={styles.intro}>
        <p className={styles.eyebrow}>{t("eyebrow")}</p>
        <h1>
          {t("title")}
          <span aria-hidden="true" className={styles.titleDot}>
            .
          </span>
        </h1>
        <p className={styles.subtitle}>{t("introduction")}</p>
      </header>

      <IdentifyWorkspace
        labels={{
          modeLabel: t("modeLabel"),
          modePlant: t("modePlant"),
          modeAnimal: t("modeAnimal"),
          modeAuto: t("modeAuto"),
          modeUnavailable: t("modeUnavailable"),
          dropTitle: t("dropTitle"),
          dropHelp: t("dropHelp"),
          dropActive: t("dropActive"),
          pastedImage: t("pastedImage"),
          chooseFile: t("chooseFile"),
          takePhoto: t("takePhoto"),
          fileTypeError: t("fileTypeError"),
          fileSizeError: t("fileSizeError"),
          fileTooLarge: t("fileTooLarge"),
          fileInvalidError: t("fileInvalidError"),
          fileDimensionsError: t("fileDimensionsError"),
          fileDecoderError: t("fileDecoderError"),
          analysing: t("analysing"),
          loadingModel: t("loadingModel", {
            size: Math.ceil(plantNetManifest.byteSize / 1_048_576),
          }),
          preprocessing: t("preprocessing"),
          runningInference: t("runningInference"),
          resolving: t("resolving"),
          resultEyebrow: t("resultEyebrow"),
          resultTitle: t("resultTitle"),
          resultIntroduction: t("resultIntroduction"),
          resultTopCandidate: t("resultTopCandidate"),
          resultAlternativeCandidate: t("resultAlternativeCandidate"),
          resultUncertainty: t("resultUncertainty"),
          resultModelName: t("resultModelName"),
          modelScore: t("modelScore"),
          noEncyclopediaMatch: t("noEncyclopediaMatch"),
          viewDetail: t("viewDetail"),
          lookupWarning: t("lookupWarning"),
          resultPhotoLabel: t("resultPhotoLabel"),
          resultReferenceLabel: t("resultReferenceLabel"),
          resultReferenceHelp: t("resultReferenceHelp"),
          resultComparePhotos: t("resultComparePhotos"),
          resultComparisonTitle: t("resultComparisonTitle"),
          resultClose: t("resultClose"),
          resultUploadedImage: t("resultUploadedImage"),
          resultReferenceImage: t("resultReferenceImage"),
          resultNoReferencePhoto: t("resultNoReferencePhoto"),
          resultAlternativesTitle: t("resultAlternativesTitle"),
          resultShowAlternatives: t("resultShowAlternatives"),
          resultHideAlternatives: t("resultHideAlternatives"),
          resultChooseCandidate: t("resultChooseCandidate"),
          resultNoCandidatesTitle: t("resultNoCandidatesTitle"),
          resultNoCandidatesBody: t("resultNoCandidatesBody"),
          resultSearchEncyclopedia: t("resultSearchEncyclopedia"),
          resultOpenEncyclopedia: t("resultOpenEncyclopedia"),
          resultRescan: t("resultRescan"),
          runtimeUnavailable: t("runtimeUnavailable"),
          offlineError: t("offlineError"),
          modelTimeout: t("modelTimeout"),
          modelLoadError: t("modelLoadError"),
          imageDecodeError: t("imageDecodeError"),
          inferenceError: t("inferenceError"),
          retry: t("retry"),
          previewAlt: t("previewAlt"),
          removeImage: t("removeImage"),
        }}
      />

      <section aria-labelledby="identify-limits" className={styles.limits}>
        <h2 id="identify-limits">{t("limitsTitle")}</h2>
        <p>{t("limitsBody")}</p>
      </section>
    </main>
  );
}
