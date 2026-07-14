/**
   * Add facilitator signature
   */
  private async addFacilitatorSignature(
    facilitator: CertificateFacilitator,
    signatureConfig: typeof this.config.signature
  ): Promise<void> {
    try {
      console.log('Adding facilitator signature:', facilitator);
      
      // Add facilitator name - use the name field which is mapped from nombre_apellido
      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(8);
      this.doc.text(
        facilitator.name.toUpperCase(),
        60,
        324,
        { align: "center" }
      );

      // Add facilitator signature if available
      let signatureUrl = null;
      
      // Check multiple possible signature fields in order of preference
      if (facilitator.firma) {
        signatureUrl = facilitator.firma;
      } else if (facilitator.signature_data?.firma) {
        signatureUrl = facilitator.signature_data.firma;
      } else if (facilitator.signature_data?.url_imagen) {
        signatureUrl = facilitator.signature_data.url_imagen;
      }
      
      if (signatureUrl) {
        console.log('Adding facilitator signature image:', signatureUrl);
        await this.addSignatureImage(
          signatureUrl,
          38,
          72,
          signatureConfig.width,
          signatureConfig.height
        );
      } else {
        console.warn('No signature image found for facilitator:', facilitator.name);
      }
    } catch (error) {
      console.error('Error adding facilitator signature:', error);
      throw error;
    }
  }
