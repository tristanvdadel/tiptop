
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import TeamMemberPermissions from '@/components/TeamMemberPermissions';

interface PermissionsTabProps {
  selectedTeamId: string | null;
  isAdmin: boolean;
}

const PermissionsTab = ({ selectedTeamId, isAdmin }: PermissionsTabProps) => {
  return (
    <Carousel
      className="w-full"
      opts={{
        align: "start",
      }}
    >
      <CarouselContent className="-ml-1">
        <CarouselItem className="pl-1">
          <div className="p-1">
            <TeamMemberPermissions teamId={selectedTeamId} isAdmin={isAdmin} />
          </div>
        </CarouselItem>
      </CarouselContent>
      <div className="hidden md:flex">
        <CarouselPrevious className="left-1" />
        <CarouselNext className="right-1" />
      </div>
    </Carousel>
  );
};

export default PermissionsTab;
