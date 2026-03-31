import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VehicleListing, VehicleListingSchema } from '../publishing/schemas/vehicle-listing.schema';
import { AiEnrichmentService } from './ai-enrichment.service';
import { AiController } from './ai.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: VehicleListing.name, schema: VehicleListingSchema },
    ]),
  ],
  providers: [AiEnrichmentService],
  controllers: [AiController],
  exports: [AiEnrichmentService],
})
export class AiModule {}
