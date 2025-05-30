const crypto = require('crypto');

// IMPORTANT: Replace with your actual PayU Merchant Key and Salt
// These should ideally be loaded from environment variables for security
const PAYU_MERCHANT_KEY = 'AyMWav'; // Provided by user
const PAYU_SALT = 'yzyJdZ6CmKReJBldt5TxOqrHUkmoGyKG'; // Provided by user (32-bit salt)

// Helper function to generate SHA-512 hash
const generateSHA512Hash = (data) => {
    return crypto.createHash('sha512').update(data).digest('hex');
};

// Controller for generating PayU hash
exports.generatePayuHash = async (req, res) => {
    try {
        const {
            key,
            txnid,
            amount,
            productinfo,
            firstname,
            email,
            phone, // Added phone
            android_surl, // Added
            android_furl, // Added
            post_url, // Added
            payment_mode, // Added
            environment, // Added
            hashType, // To determine which hash to generate
            package_name, // For UPI intent
            user_credentials, // For store card
            vpa, // For VPA validation/collect flow
            additional_param, // UDFs etc.
            si_params // Standing Instruction params
        } = req.body;

        let hashString = '';
        let paymentHash = '';
        let validateVpaHash = '';

        // Construct the string for payment hash
        // Format: key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||salt
        const udf1 = additional_param?.udf1 || '';
        const udf2 = additional_param?.udf2 || '';
        const udf3 = additional_param?.udf3 || '';
        const udf4 = additional_param?.udf4 || '';
        const udf5 = additional_param?.udf5 || '';

        // Payment hash string
        const paymentHashBase = `${key}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|${udf1}|${udf2}|${udf3}|${udf4}|${udf5}||||||`;
        paymentHash = generateSHA512Hash(paymentHashBase + PAYU_SALT);

        // VPA validation hash string (if needed)
        // Format: sha512(key|<validateVPA>|vpa|salt)
        if (vpa) {
            const validateVpaCommand = 'validate_vpa'; // Command for VPA validation
            const validateVpaHashBase = `${key}|${validateVpaCommand}|${vpa}|`;
            validateVpaHash = generateSHA512Hash(validateVpaHashBase + PAYU_SALT);
        }

        // Return all generated hashes
        const result = {
            payment: paymentHash,
            validate_vpa: validateVpaHash || null // Include as null if not generated
        };
        
        console.log('Backend: Generated hashes. Sending 200:', result);
        res.status(200).json(result);

    } catch (error) {
        console.error('Backend: Error generating PayU hash:', error);
        res.status(500).json({ message: 'Server error during hash generation' });
    }
};

// Controller for handling PayU success callback
exports.handlePayuSuccess = async (req, res) => {
    try {
        // PayU sends transaction response in req.body (POST) or req.query (GET)
        const payuResponse = req.method === 'POST' ? req.body : req.query;
        console.log('PayU Success Callback Received:', payuResponse);

        // IMPORTANT: Implement server-side verification here
        // 1. Verify the transaction status (e.g., check 'status' field in payuResponse)
        // 2. Re-calculate the hash on your server using the received parameters and your salt
        //    and compare it with the 'hash' received from PayU to prevent tampering.
        // 3. Update your database with the transaction status.
        // 4. Redirect the user or render a success page.

        // For demonstration, just sending a success message.
        res.status(200).send('Payment Success! Thank you.');
        // In a real application, you might redirect to a frontend success page:
        // res.redirect('https://your-app.com/payment-success?status=success&txnid=' + payuResponse.txnid);

    } catch (error) {
        console.error('Error handling PayU success callback:', error);
        res.status(500).send('Server error during success callback');
    }
};

// Controller for handling PayU failure callback
exports.handlePayuFailure = async (req, res) => {
    try {
        const payuResponse = req.method === 'POST' ? req.body : req.query;
        console.log('PayU Failure Callback Received:', payuResponse);

        // IMPORTANT: Implement server-side verification here
        // 1. Verify the transaction status (e.g., check 'status' field)
        // 2. Update your database with the transaction status.
        // 3. Redirect the user or render a failure page.

        // For demonstration, just sending a failure message.
        res.status(200).send('Payment Failed. Please try again.');
        // In a real application, you might redirect to a frontend failure page:
        // res.redirect('https://your-app.com/payment-failure?status=failed&txnid=' + payuResponse.txnid);

    } catch (error) {
        console.error('Error handling PayU failure callback:', error);
        res.status(500).send('Server error during failure callback');
    }
};
