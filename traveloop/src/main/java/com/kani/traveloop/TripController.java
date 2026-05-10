package com.kani.traveloop;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/trip")
@CrossOrigin("*")
public class TripController {

    @Autowired
    private TripRepository tripRepository;

    @GetMapping
    public ResponseEntity<Trip> getTrip() {
        Trip trip = tripRepository.findAll()
                .stream()
                .findFirst()
                .orElseGet(() -> {
                    Trip defaultTrip = new Trip();
                    defaultTrip.setStartDate("2025-05-18");
                    defaultTrip.setEndDate("2025-05-24");
                    return tripRepository.save(defaultTrip);
                });
        return ResponseEntity.ok(trip);
    }

    @PostMapping("/update")
    public ResponseEntity<Trip> updateTrip(@RequestBody Trip payload) {
        Trip trip = tripRepository.findAll()
                .stream()
                .findFirst()
                .orElseGet(Trip::new);

        trip.setStartDate(payload.getStartDate());
        trip.setEndDate(payload.getEndDate());

        Trip saved = tripRepository.save(trip);
        return ResponseEntity.ok(saved);
    }
}
