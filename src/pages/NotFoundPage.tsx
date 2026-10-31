import { Link } from "react-router";
import { useTranslation } from "react-i18next";

export default function SetNotFound() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t("sets.notFoundTitle")}</h1>
      <p className="muted">{t("sets.notFoundText")}</p>
      <Link to="/sets" className="back-link">
        {t("sets.backToSets")}
      </Link>
    </div>
  );
}
