export const metadata = {
    title: 'Shipping Policy | Tutorlix',
    description:
        'Read the shipping policy of Tutorlix. Learn how our digital courses and services are delivered.',
};

export default function ShippingPolicyPage() {
    return (
        <div className="container mx-auto px-4 py-12">
            <div className="max-w-3xl mx-auto prose prose-slate lg:prose-lg">
                <h1>Shipping Policy</h1>
                <p className="lead">Welcome to https://tutorlix.com!</p>

                <p>
                    This Shipping Policy explains how products and services purchased on
                    Tutorlix are delivered to users.
                </p>

                <h2>1. Nature of Our Services</h2>
                <p>
                    Tutorlix is a digital education platform that provides online courses,
                    live and recorded classes, digital study materials, and subscription-
                    based learning services.
                </p>
                <p>
                    We do <strong>not</strong> sell or ship any physical products.
                </p>

                <h2>2. Delivery of Digital Products</h2>
                <p>
                    All Tutorlix products are delivered electronically. Once your payment
                    is successfully completed, access to the purchased content is
                    provided through:
                </p>
                <ul>
                    <li>Your Tutorlix account on our website</li>
                    <li>The Tutorlix mobile application (if applicable)</li>
                </ul>

                <h2>3. Access Timeline</h2>
                <p>
                    Most digital products provide <strong>instant access</strong> after
                    successful payment.
                </p>
                <p>
                    In rare cases, such as live batches or manual activations, access may
                    be granted within <strong>24 hours</strong>.
                </p>

                <h2>4. Shipping Charges</h2>
                <p>
                    Since all our products and services are digital:
                </p>
                <ul>
                    <li>No shipping or delivery charges apply</li>
                    <li>No courier or postal services are used</li>
                </ul>

                <h2>5. Geographic Availability</h2>
                <p>
                    Tutorlix services are available globally, subject to:
                </p>
                <ul>
                    <li>Internet availability</li>
                    <li>Local laws and regulations</li>
                    <li>Payment gateway support in your country</li>
                </ul>

                <h2>6. Issues With Access</h2>
                <p>
                    If you experience any issues such as:
                </p>
                <ul>
                    <li>Payment completed but access not received</li>
                    <li>Unable to access purchased courses</li>
                    <li>Technical or account-related issues</li>
                </ul>
                <p>
                    Please contact our support team with your registered email ID and
                    payment details.
                </p>

                <h2>7. Contact Us</h2>
                <p>
                    If you have any questions regarding this Shipping Policy, you can
                    contact us at:
                </p>
                <ul>
                    <li>Email: support@tutorlix.com</li>
                    <li>Website: https://tutorlix.com</li>
                </ul>

                <p className="text-sm text-gray-500 mt-8">
                    Last updated: January 2026
                </p>
            </div>
        </div>
    );
}
