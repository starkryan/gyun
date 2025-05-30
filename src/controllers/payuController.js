const crypto = require('crypto');

// IMPORTANT: Replace with your actual PayU Merchant Key and Salt
// These should ideally be loaded from environment variables for security
const PAYU_MERCHANT_KEY = '3LySeo'; // Provided by user
const PAYU_SALT = 'qzDFCG4c3ocV6m8Z0GbazBsvfqvIXlZO'; // Provided by user (32-bit salt)

// Helper function to generate SHA-512 hash
const generateSHA512Hash = (data) => {
    return crypto.createHash('sha512').update(data).digest('hex');
};

// Controller for generating PayU hash
exports.generatePayuHash = async (req, res) => {
    try {
        const { hashString, hashName } = req.body; // Expect hashString and hashName from SDK event

        if (!hashString || !hashName) {
            return res.status(400).json({ message: 'Missing hashString or hashName in request body' });
        }

        // The hashString provided by the SDK's generateHash event already contains all necessary parameters
        // (e.g., key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5|||||| for payment hash)
        // We just need to append the salt and hash it.
        const hashValue = generateSHA512Hash(hashString + PAYU_SALT);

        const result = {
            [hashName]: hashValue // Return only the requested hash with its name
        };
        
        console.log('Backend: Generated hash. Sending 200:', result);
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
