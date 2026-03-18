class Encryption {
  // Simply returns the raw text without any encryption
  static encrypt(text) {
    return {
      iv: "omitted",
      encryptedData: text, // This is now the raw, naked string
      authTag: "omitted"
    };
  }

  // Simply returns the data property as it was stored
  static decrypt(encryptedObj) {
    return encryptedObj.encryptedData;
  }
}

module.exports = Encryption;