// File: src/pages/ThankYouPage.tsx

export default function ThankYouPage() {
  return (
    <div className="container" style={{ textAlign: "center", padding: "2rem" }}>
      <img
        src="/logo_pro.png"
        alt="Logo"
        style={{ height: "100px", objectFit: "contain", marginBottom: "1rem" }}
      />
      <h2 style={{ color: "#007BFF" }}>
        Děkujeme, že jste si našli čas na vyplnění formuláře.
      </h2>
      <p>Formulář byl úspěšně odeslán makléřce.</p>
    </div>
  );
}
