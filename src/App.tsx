import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
//import PropertyRentalForm from "./pages/PropertyRentalForm";
//import PropertySalesForm from "./pages/PropertySalesForm"; // ✅ new import
import BookingPage from "./pages/BookingPage";
import Home from "./pages/Home";
import ThankYouPage from "./pages/ThankYouPage";
import SalesFinanceForm from "./pages/SalesFinanceForm";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />

        {/* Rental form 
        <Route path="/:propertyCode" element={<PropertyRentalForm />} />
*/}
        {/* Sales form 
        <Route
          path="/:propertyCode/sales-form"
          element={<PropertySalesForm />}
        />
*/}
        <Route path="/book/:propertyCode" element={<BookingPage />} />
        <Route path="/thank-you" element={<ThankYouPage />} />
        <Route path="/:propertyCode" element={<SalesFinanceForm />} />
      </Routes>
    </Router>
  );
}
