export const EMAIL_LOGO_URL =
  'https://bkbsxmrrjwvmefazbtra.supabase.co/storage/v1/object/public/public-assets/ITHERA-logo-com.png';

export const baseTemplate = ({
  title,
  content,
}: {
  title: string;
  content: string;
}) => {
  return `
    <div style="margin:0; padding:24px; background-color:#f5f7fb;">
      <div
        style="
          max-width:560px;
          margin:0 auto;
          background-color:#ffffff;
          border-radius:16px;
          padding:32px 24px;
          font-family:Arial, Helvetica, sans-serif;
          color:#1f2937;
          text-align:center;
          box-shadow:0 4px 14px rgba(0,0,0,0.06);
        "
      >
        <div style="margin-bottom:24px;">
          <img
            src="${EMAIL_LOGO_URL}"
            alt="ITHERA"
            style="width:140px; height:auto; display:block; margin:0 auto 24px auto;"
          />
        </div>

        <h2
          style="
            margin:0 0 16px 0;
            font-size:28px;
            line-height:1.2;
            color:#111827;
          "
        >
          ${title}
        </h2>

        <div
          style="
            font-size:15px;
            line-height:1.6;
            color:#4b5563;
            text-align:center;
          "
        >
          ${content}
        </div>

        <div
          style="
            margin-top:32px;
            padding-top:20px;
            border-top:1px solid #e5e7eb;
            font-size:12px;
            line-height:1.5;
            color:#9ca3af;
          "
        >
          ITHERA • Planifica tu viaje en equipo
        </div>
      </div>
    </div>
  `;
};